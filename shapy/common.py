# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import tornado.web


class APIHandler(tornado.web.RequestHandler):
  """Handles requests to the REST API."""

  def get(self, url):
    """Handles a GET request."""
    self.write('get')

  def post(self, url):
    """Handles a POST request."""
    self.write('post')
