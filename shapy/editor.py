# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import json
import momoko

from tornado.web import asynchronous
from tornado.gen import engine, coroutine, Task, Return
from tornado.web import HTTPError
from tornado.websocket import WebSocketHandler
import tornadoredis

from shapy.common import APIHandler, BaseHandler, session



class Scene(object):
  """Wraps common information about a scene."""

  @classmethod
  @coroutine
  def get(cls, redis, scene_id):
    """Returns an object by reading data from postgres and redis."""
    data = yield Task(redis.hmget, 'scene:%s' % scene_id, [
        'name',
        'users'
    ])
    raise Return(Scene(scene_id, data if data else {}))


  @classmethod
  @coroutine
  def put(cls, redis, scene):
    yield Task(redis.hmset, 'scene:%s' % scene.id, {
        'name': scene.name,
        'users': json.dumps(scene.users)
    })
    raise Return(None)


  def __init__(self, scene_id, data):
    """Creates a new scene object."""

    def arg(key, default):
      val = data[key] if key in data else default
      return val or default

    self.id = scene_id
    self.scene_id = scene_id
    self.name = arg('name', 'New Scene')
    self.users = json.loads(arg('users', '[]'))

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

    # Start listening & broadcasting on the channel.
    self.chan = tornadoredis.Client(
        host=self.application.RD_HOST,
        port=self.application.RD_PORT,
        password=self.application.RD_PASS)
    self.chan.connect()

    self.lock = self.redis.lock(self.lock_id, lock_ttl=10)
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
    yield self.to_channel({
      'type': 'join',
      'user': self.user.id
    })

  @coroutine
  def on_message(self, message):
    """Handles an incoming message."""

    if not hasattr(self, 'user'):
      return
    data = json.loads(message)

    # Update database with changes.
    #if data['type'] == 'name':
    #  def update_name(scene):
    #    scene.name = data['value']
    #  yield self.update_scene_(update_name)

    yield self.to_channel(data)


  @coroutine
  def on_channel(self, message):
    """Handles a message from the redis channel."""

    if not hasattr(self, 'user') or message.kind != 'message':
      return

    self.write_message(message.body)


  @coroutine
  def on_close(self):
    """Handles connection termination."""

    if not hasattr(self, 'user'):
      return

    # Remove the user from the scene.
    scene = yield Scene.get(self.redis, self.scene_id)
    scene.remove_user(self.user.id)
    yield Scene.put(self.redis, scene)

    # Leave the scene (of the crime).
    self.to_channel({
        'type': 'leave',
        'user': self.user.id
    })

    # Terminate the redis connection.
    yield Task(self.chan.unsubscribe, self.chan_id)
    self.chan.disconnect()

  @coroutine
  def update_scene_(self, func):
    """Helper to update a scene."""

    yield Task(self.lock.acquire, blocking=True)
    scene = yield Scene.get(self.redis, self.scene_id)
    func(scene)
    yield Scene.put(self.redis, scene)
    yield Task(self.lock.release)
    raise Return(scene)

  @coroutine
  def to_channel(self, data):
    """Puts a message into the channel, tagging it with a seqnum."""

    seq = yield Task(self.redis.hincrby, 'scene:%s' % self.scene_id, 'seq', 1)
    data['seq'] = seq

    yield Task(self.redis.publish, self.chan_id, json.dumps(data))

