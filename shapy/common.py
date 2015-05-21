# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import functools
import json

from tornado.web import RequestHandler, HTTPError
from tornado.gen import Return, Task, coroutine
import tornadoredis

from shapy.account import Account


def session(method):
  """Decorates methods to inject user info based on session token."""

  @coroutine
  @functools.wraps(method)
  def wrapper(self, *args, **kwargs):
    # If the session token is not set, omit the user id.
    token = self.get_secure_cookie('session')
    if not token:
      method(self, *args, user=None, **kwargs)
      raise Return()

    # Map the session ID to a user.
    user_id = yield Task(self.redis.hget, 'session:%s' % token, 'user_id')
    if not user_id:
      method(self, *args, user=None, **kwargs)
      raise Return()

    # Fetch the user info from the database & pass it to the method.
    user = yield Account.get(self.db, user_id)
    method(self, *args, user=user, **kwargs)

  return wrapper



class BaseHandler(RequestHandler):
  """Base handler that lazily manages sessions and database connections."""

  @property
  def db(self):
    """Returns a reference to the database pool."""
    return self.application.db

  @property
  def redis(self):
    """Returns a reference to the redis connection."""
    if not hasattr(self, 'redis_conn'):
      self.redis_conn = tornadoredis.Client(
          host=self.application.RD_HOST,
          port=self.application.RD_PORT,
          password=self.application.RD_PASS)
      self.redis_conn.connect()
    return self.redis_conn



class APIHandler(BaseHandler):
  """Handles requests to the REST API."""

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