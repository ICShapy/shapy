# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import json
import momoko

from tornado.gen import coroutine
from tornado.web import HTTPError
import tornado.websocket

from common import APIHandler



class WSHandler(tornado.websocket.WebSocketHandler):
  """Handles websocket connections."""

  def open(self, edit_id):
    """Handles an incoming connection."""
    if self.get_secure_cookie('session_id') is not None:
      user_id = int(self.get_secure_cookie('session_id'))
    else:
      user_id = 0

    self.write_message(json.dumps({
        'type': 'meta',
        'name': 'Hardcoded name',
        'users': [
            {
              'id': 3,
              'name': 'A'
            },
            {
              'id': 4,
              'name': 'B'
            }
        ]
    }))

  def on_message(self, message):
    """Handles an incoming message."""
    pass

  def on_close(self):
    """Handles connection termination."""
    pass


class SceneHandler(APIHandler):
  """Retrieves information a specific scene."""

  def get(self, id):
    self.write(json.dumps({
        'name': 'Hardcoded name',
        'users': []
    }))