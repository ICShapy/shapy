# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import os

import hashlib
import json

import momoko
from tornado.gen import coroutine, Task
from tornado.web import HTTPError
import tornadoredis

from shapy.account import Account
from shapy.common import APIHandler, session



class AuthHandler(APIHandler):
  """Handles requests to the REST API."""

  @session
  @coroutine
  def get(self, user):
    """Returns the serialized user or a null id."""

    self.write(json.dumps(user.__dict__ if user else { 'id': 0 }))


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
        '''SELECT id, password FROM users WHERE email=%s''', (email,))
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

    # Generate a session token & map the user to it.
    token = os.urandom(16).encode('hex')
    yield Task(self.redis.hset, 'session:%s' % token, 'user_id', user_id)
    self.set_secure_cookie('session', token)



class LogoutHandler(APIHandler):
  """Handles requests to the REST API."""

  @session
  @coroutine
  def post(self, user):
    """Logs a user out by invalidating the session token."""

    token = self.get_secure_cookie('session')
    yield Task(self.redis.hdel, 'session:%s' % token, 'user_id')
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
    salt = os.urandom(16).encode('hex')
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

    # Check if the user was created successfully.
    user = cursor.fetchone()
    if not user:
      raise HTTPError(400, 'Registering failed.')

    # Log the user in after registering.
    token = os.urandom(16).encode('hex')
    yield Task(self.redis.hset, 'session:%s' % token, 'user_id', user[0])
    self.set_secure_cookie('session', token)



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



class InfoHandler(APIHandler):
  """Handles a request to retrieve lightweight user information."""

  @coroutine
  def get(self, user_id):
    user = yield Account.get(self.db, user_id)
    self.write(json.dumps(user.__dict__))
