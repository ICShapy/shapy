# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import tornado.websocket



class WSHandler(tornado.websocket.WebSocketHandler):
  """Handles websocket connections."""

  def open(self):
    """Handles an incoming connection."""
    print self.get_secure_cookie('session_id')

  def on_message(self, message):
    """Handles an incoming message."""
    print("Y")

  def on_close(self):
    """Handles connection termination."""
    print("Z")