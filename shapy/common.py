# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import functools
import json

from tornado.web import RequestHandler, HTTPError



class APIHandler(RequestHandler):
  """Handles requests to the REST API."""

  @property
  def db(self):
    return self.application.db

  def get_current_user(self):
    """Returns the currently authenticated user."""
    try:
      return int(self.get_secure_cookie('session_id'))
    except:
      return None

  def write_error(self, status_code, **kwargs):
    """Handles error messages, outputting a properly formatted JSON message."""

    if 'exc_info' in kwargs:
      _, exception, _ = kwargs['exc_info']
      msg = str(exception)
    else:
      msg = 'Unknown error.'

    self.write(json.dumps({ 'error': msg }))



def authenticated(method):
  """Decorate methods with this to require that the user be logged in."""
  @functools.wraps(method)
  def wrapper(self, *args, **kwargs):
    if not self.current_user:
      raise HTTPError(403)
    return method(self, *args, **kwargs)
  return wrapper