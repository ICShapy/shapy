# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import functools
import json

import momoko
from tornado.web import RequestHandler, HTTPError
from tornado.gen import Return, coroutine
import tornadoredis


def retrieve_user_id(method):
  """Decorate methods with this to retrieve user id from redis"""
  @functools.wraps(method)
  def wrapper(self, *args, **kwargs):
    if self.current_user:
      user_id = yield Task(self.redis.hget, 'session:%s' % temp_id, 'user_id', callback=method)
      raise Return(user_id)
    yield method(self, *args, **kwargs)
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

  @coroutine
  def get_user_data(self, user_id):
    """Returns information about the current user."""
    cursor = yield momoko.Op(self.db.execute,
        '''SELECT first_name, last_name, email FROM users WHERE id=%s''',
        (user_id,))
    user = cursor.fetchone()
    if not user:
      raise HTTPError(401, 'Invalid user id.')

    # Pack it & send it to the server.
    first_name, last_name, email = user
    raise Return({
        'id': self.current_user,
        'first_name': first_name,
        'last_name': last_name,
        'email': email
    })

  @coroutine
  def get_current_user(self):
    """Returns the currently authenticated user."""
    try:
      temp_id = self.get_secure_cookie('session_id')
    except:
      return None
    
    self.get(temp_id)

    callback()

  @retrieve_user_id
  def get(self, temp_id):
    pass







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