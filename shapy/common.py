# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import os
import functools
import hashlib
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
      yield method(self, *args, user=None, **kwargs)
      raise Return()

    # Map the session ID to a user & refresh expiration.
    key = 'session:%s' % token
    data = yield Task(self.redis.get, key)
    yield Task(self.redis.expire, key, Account.SESSION_EXPIRE)

    # If user not logged in, pass None.
    if not data:
      yield method(self, *args, user=None, **kwargs)
      raise Return()

    # Initialize the account object.
    data = json.loads(data)
    yield method(self, *args, user=Account(
      data['id'],
      first_name=data['first_name'],
      last_name=data['last_name'],
      email=data['email']
    ), **kwargs)
    raise Return()

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
    return self.application.redis

  def on_finish(self):
    """Cleanup."""

    if hasattr(self, 'redis_conn'):
      self.redis_conn.disconnect()

  @coroutine
  def login(self, user):
    """Logs the user in, storing a session entry in the database."""
    token = os.urandom(16).encode('hex')
    yield Task(self.redis.set, 'session:%s' % token, json.dumps({
      'id': user[0],
      'first_name': user[1],
      'last_name': user[2],
      'email': user[3]
    }), Account.SESSION_EXPIRE)
    self.set_secure_cookie('session', token)



class APIHandler(BaseHandler):
  """Handles requests to the REST API."""

  def prepare(self):
    """Read request json into arguments dict."""

    if self.request.body:
      for key, value in json.loads(self.request.body).items():
        self.request.arguments[key] = [str(value)]

  def set_default_headers(self):
    """Set the JSON headers."""

    self.set_header('Content-Type', 'application/json')

  def write_error(self, status_code, **kwargs):
    """Handles error messages, outputting a properly formatted JSON message."""

    if 'exc_info' in kwargs:
      _, exception, _ = kwargs['exc_info']
      msg = str(exception)
    else:
      msg = 'Unknown error.'

    self.write(json.dumps({ 'error': msg }))
    self.finish()

