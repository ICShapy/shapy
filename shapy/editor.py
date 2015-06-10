# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import json
import momoko

from threading import Timer
from tornado.web import asynchronous
from tornado.gen import engine, coroutine, Task, Return
from tornado.web import HTTPError
from tornado.websocket import WebSocketHandler
import tornadoredis

from shapy.common import APIHandler, BaseHandler, session


class Scene(object):
  """Wraps common information about a scene."""

  def __init__(self, scene_id, name='New Scene', users=[]):
    """Creates a new scene object."""

    self.id = scene_id
    self.scene_id = scene_id
    self.name = name
    self.users = users

  def add_user(self, user):
    """Adds a user to the scene."""
    if user not in self.users:
      self.users.append(user)

  def remove_user(self, user):
    """Removes a user form the scene."""
    if user in self.users:
      self.users.remove(user)



class WSHandler(WebSocketHandler, BaseHandler):
  """Handles websocket connections."""

  @session
  @coroutine
  def open(self, scene_id, user):
    """Handles an incoming connection."""

    # If the user is not valid, quit the room.
    if not user:
      self.close()
      return

    # Read the scene ID & create a unique channel ID.
    self.user = user
    self.scene_id = scene_id
    self.chan_id = 'chan_%s' % scene_id
    self.lock_id = 'lock_%s' % scene_id
    self.objects = set()

    # Start listening & broadcasting on the channel.
    self.chan = tornadoredis.Client(
        host=self.application.RD_HOST,
        port=self.application.RD_PORT,
        password=self.application.RD_PASS)
    self.chan.connect()
    yield Task(self.chan.subscribe, self.chan_id)
    self.chan.listen(self.on_channel)

    # Get the scene object & add the client.
    def add_user(scene):
      scene.add_user(self.user.id)
    scene = yield self.update_scene_(add_user)

    # Broadcast join message.
    self.write_message(json.dumps({
        'type': 'meta',
        'name': scene.name,
        'users': scene.users
    }))

    # Get all the existing locks.
    for key in self.redis.keys('scene:%s:*' % self.scene_id):
      user = int(self.redis.get(key))
      id = key.split(':')[-1]
      if user == self.user.id:
        self.objects.add(id)

      self.write_message(json.dumps({
        'type': 'lock',
        'objects': [id],
        'user': user
      }))

    self.to_channel({
      'type': 'join',
      'user': self.user.id
    })

  @coroutine
  def on_message(self, message):
    """Handles an incoming message."""

    if not hasattr(self, 'user'):
      return
    data = json.loads(message)

    # Name change request - update object.
    if data['type'] == 'name':
      def update_name(scene):
        scene.name = data['value']
      yield self.update_scene_(update_name)

    # Request to lock on an object.
    if data['type'] == 'lock':
      objects = []
      for id in data['objects']:
        key = 'scene:%s:%s' % (self.scene_id, id)
        lock = self.redis.setnx(key, self.user.id)
        if lock:
          self.redis.expire(key, 60 * 10)
          self.objects.add(id)
          objects.append(id)
      data['objects'] = objects

    # Request to unlock objects.
    if data['type'] == 'unlock':
      objects = []
      for id in data['objects']:
        self.redis.delete('scene:%s:%s' % (self.scene_id, id))
        objects.append(id)
        self.objects.remove(id)
      data['objects'] = objects

    # Broadcast the message, appending a seqnum.
    seq = self.to_channel(data)


  @coroutine
  def on_channel(self, message):
    """Handles a message from the redis channel."""

    if not hasattr(self, 'user') or not self.user or message.kind != 'message':
      return

    self.write_message(message.body)


  @coroutine
  def on_close(self):
    """Handles connection termination."""

    if not hasattr(self, 'user'):
      return

    # Remove the user from the scene.
    def remove_user(scene):
      scene.remove_user(self.user.id)
    yield self.update_scene_(remove_user)

    # Unlock all objects.
    for id in self.objects:
      self.redis.delete('scene:%s:%s' % (self.scene_id, id))

    # Leave the scene (of the crime).
    user_id = self.user.id
    self.user = None
    self.to_channel({
        'type': 'leave',
        'user': user_id
    })

    # Terminate the redis connection.
    yield Task(self.chan.unsubscribe, self.chan_id)
    yield Task(self.chan.disconnect)


  @coroutine
  def update_scene_(self, func):
    """Helper to update a scene."""

    #yield Task(self.lock.acquire, blocking=True)

    # Retrieve the scene object.
    data = self.redis.hmget('scene:%s' % self.scene_id, [
        'name',
        'users'
    ])

    if data:
      scene = Scene(self.scene_id,
        name=data[0],
        users=json.loads(data[1])
      )
    else:
      cursor = yield momoko.Op(self.db.execute,
        '''SELECT name FROM assets WHERE id = %(id)s''', {
        'id': self.scene_id
      })
      scene = Scene(self.scene_id,
        name=cursor.fetchone()['name'],
        users=[]
      )

    # Apply changes.
    func(scene)

    # Store the modified scene.
    self.redis.hmset('scene:%s' % self.scene_id, {
        'name': scene.name,
        'users': json.dumps(scene.users)
    })

    #yield Task(self.lock.release)
    raise Return(scene)

  @coroutine
  def to_channel(self, data):
    """Puts a message into the channel, tagging it with a seqnum."""

    seq = self.redis.hincrby('scene:%s' % self.scene_id, 'seq', 1)
    data['seq'] = seq
    self.redis.publish(self.chan_id, json.dumps(data))
    return seq

