# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json

import momoko
from tornado.gen import coroutine, Task
from tornado.web import HTTPError

from shapy.common import APIHandler, authenticated



class AuthHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  def get(self):
    # If user not logged in, return an error.
    if not self.current_user:
      self.write(json.dumps({ 'id': 0 }))
      return
    data = yield self.get_user_data(self.current_user)
    self.write(json.dumps(data))



class LoginHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  def post(self):
    # Retrieve the username & password.
    req = json.loads(self.request.body)
    email = req['email'] if 'email' in req else None
    passw = req['passw'] if 'passw' in req else None
    if not email or not passw:
      raise HTTPError(400, 'Missing username or password.')

    # Fetch data from the database.
    cursor = yield momoko.Op(self.db.execute,
        '''SELECT id, password FROM users WHERE email=%s''',
        (email,))
    user = cursor.fetchone()
    if not user:
      raise HTTPError(401, 'Invalid username or password.')

    # Fetch the hash & the salt.
    user_id, user_passw = user
    user_hash = user_passw[0:128]
    user_salt = user_passw[128:160]

    # Check if passwords match.
    passw_hash = hashlib.sha512(passw + user_salt).hexdigest()
    if passw_hash != user_hash:
      raise HTTPError(401, 'Invalid username or password.')

    # Set the session cookie.
    self.set_secure_cookie('session_id', str(user_id))



class LogoutHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  @authenticated
  def post(self):
    self.clear_all_cookies()



class RegisterHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  def post(self):
    pass



class InfoHandler(APIHandler):
  """Handles a request to retrieve lightweight user information."""

  @coroutine
  def get(self, user_id):
    data = yield self.get_user_data(user_id)
    self.write(json.dumps(data))