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

from shapy.common import APIHandler, BaseHandler, authenticated



class Scene(object):
  """Wraps common information about a scene."""

  def __init__(self, scene_id, data):
    """Creates a new scene object."""

    def arg(key, default):
      return data[key] if key in data else default

    self.key = 'scene_%s' % scene_id
    self.scene_id = scene_id
    self.name = arg('name', 'Untitled Scene')
    self.users = arg('users', [])

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

  @coroutine
  def open(self, scene_id):
    """Handles an incoming connection."""

    # If the user is not valid, quit the room.
    if not self.current_user:
      self.open = False
      self.close()
      return

    # Read the scene ID & create a unique channel ID.
    self.open = True
    self.scene_id = scene_id
    self.chan_id = 'chan_%s' % scene_id

    # Start listening & broadcasting on the channel.
    self.chan = tornadoredis.Client(
        host=self.application.RD_HOST,
        port=self.application.RD_PORT,
        password=self.application.RD_PASS)
    self.chan.connect()
    yield Task(self.chan.subscribe, self.chan_id)
    self.chan.listen(self.on_channel)

    # Get the scene object & add the client.
    scene = yield self.get_scene(scene_id)

    # Transfer initial metadata.
    self.write_message(json.dumps({
        'type': 'meta',
        'name': scene.name,
        'users': scene.users
    }))

    # Broadcast the initial join message.
    scene.add_user(self.current_user)
    yield self.put_scene(scene)
    self.redis.publish(self.chan_id, json.dumps({
        'type': 'join',
        'user': self.current_user
    }))


  @coroutine
  def on_message(self, message):
    """Handles an incoming message."""
    if not self.open:
      return

    self.redis.publish(self.chan_id, message)


  @coroutine
  def on_channel(self, message):
    """Handles a message from the redis channel."""

    if not self.open or message.kind != 'message':
      return

    self.write_message(message.body)


  @coroutine
  def on_close(self):
    """Handles connection termination."""
    if not self.open:
      return

    # Remove the user from the scene.
    scene = yield self.get_scene(self.scene_id)
    scene.remove_user(self.current_user)
    yield self.put_scene(scene)

    # Leave the scene (of the crime).
    self.redis.publish(self.chan_id, json.dumps({
        'type': 'leave',
        'user': self.current_user
    }))

    # Terminate the redis connection.
    self.chan.unsubscribe(self.chan_id)
    self.chan.disconnect()


  @coroutine
  def get_scene(self, scene_id):
    """Returns an object by reading data from postgres and redis."""
    data = yield Task(self.redis.get, 'scene_%s' % scene_id)
    raise Return(Scene(scene_id, json.loads(data) if data else {}))


  @coroutine
  def put_scene(self, scene):
    yield Task(self.redis.set, scene.key, json.dumps({
        'name': scene.name,
        'users': scene.users
    }))
    raise Return(None)


class SceneHandler(APIHandler):
  """Retrieves information a specific scene."""

  @coroutine
  def get(self, id):
    self.write(json.dumps({
        'name': 'Hardcoded name',
        'users': []
    }))