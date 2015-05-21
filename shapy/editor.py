# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import json
import momoko

from tornado.gen import engine, coroutine, Task
from tornado.web import HTTPError
from tornado.websocket import WebSocketHandler
import tornadoredis

from common import APIHandler, BaseHandler, authenticated



class WSHandler(WebSocketHandler, BaseHandler):
  """Handles websocket connections."""

  @engine
  def open(self, edit_id):
    """Handles an incoming connection."""
    self.edit_id = edit_id
    self.chan_id = 'chan_%s' % edit_id

    # Start listening & broadcasting on the channel.
    self.chan = tornadoredis.Client(
        host=self.application.RD_HOST,
        port=self.application.RD_PORT,
        password=self.application.RD_PASS)
    self.chan.connect()
    yield Task(self.chan.subscribe, self.chan_id)
    self.chan.listen(self.on_channel)

    # Broadcast the initial join message.
    self.redis.publish(self.chan_id, json.dumps({
      'type': 'join',
      'user': self.current_user
    }))

  @coroutine
  def on_message(self, message):
    """Handles an incoming message."""
    self.redis.publish(self.chan_id, message)

  @coroutine
  def on_channel(self, message):
    """Handles a message from the redis channel."""

    if message.kind != 'message':
      return
    self.write_message(message.body)

  @coroutine
  def on_close(self):
    """Handles connection termination."""

    if self.chan.subscribed:
      self.chan.unsubscribe(self.chan_id)
    self.chan.disconnect()



class SceneHandler(APIHandler):
  """Retrieves information a specific scene."""

  @coroutine
  def get(self, id):
    self.write(json.dumps({
        'name': 'Hardcoded name',
        'users': []
    }))