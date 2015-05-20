# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json

import momoko
from tornado.gen import coroutine
from tornado.web import HTTPError

from common import APIHandler, authenticated



class AuthHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  def get(self):
    # If user not logged in, return an error.
    if not self.current_user:
      self.write(json.dumps({ 'id': 0 }))
      return

    # Fetch user data.
    cursor = yield momoko.Op(self.db.execute,
        '''SELECT first_name, last_name, email FROM users WHERE id=%s''',
        (self.current_user,))
    user = cursor.fetchone()
    if not user:
      raise HTTPError(401, 'Invalid user id.')

    # Pack it & send it to the server.
    first_name, last_name, email = user
    self.write(json.dumps({
        'id': self.current_user,
        'first_name': first_name,
        'last_name': last_name,
        'email': email
    }))



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
    # Retrieve the name, username, password.
    req = json.loads(self.request.body)
    firstName = req['firstName'] if 'firstName' in req else None
    lastName = req['lastName'] if 'lastName' in req else None
    email = req['email'] if 'email' in req else None
    password = req['password'] if 'password' in req else None
    if not firstName or not lastName or not email or not password:
      raise HTTPError(400, 'Missing field, cannot register.')

    # Generate salt
    salt = os.urandom(32)
    # Generate password hash
    password_hash = hashlib.sha512(password + salt).hexdigest()
    # Concatenate
    pass_with_salt = password_hash + salt

    # Create new account - store in database
    cursor = yield momoko.Op(self.db.execute,
        '''INSERT INTO users (id, first_name, last_name, email, password)
           VALUES (DEFAULT, %s, %s, %s, %s)
           RETURNING id
           ''',
        (firstName, lastName, email, pass_with_salt))

    # Get user id
    user_id = cursor.fetchone()

    if not user_id:
      raise HTTPError(400, 'Registering failed.')

    # Login - set the session cookie.
    self.set_secure_cookie('session_id', str(user_id))



class CheckHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  def get(self, email):
    # Notify if request invalid
    if not email:
      raise HTTPError(400, 'Missing username (email).')

    # Check if username already present in database
    cursor = yield momoko.Op(self.db.execute,
        '''SELECT 1 FROM users WHERE email=%s''',
        (email,))

    self.write(json.dumps({
        'unique' : not cursor.fetchone()
    }))

