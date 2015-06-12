# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json
import os

import momoko
from tornado.auth import FacebookGraphMixin, GoogleOAuth2Mixin
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
        '''SELECT id, first_name, last_name, email, password
           FROM users
           WHERE email=%s''', (email,))
    user = cursor.fetchone()
    if not user or not user[4]:
      raise HTTPError(401, 'Invalid username or password.')

    # Fetch the hash & the salt.
    user_id, _, _, _, user_passw = user
    user_hash = user_passw[0:128]
    user_salt = user_passw[128:160]

    # Check if passwords match.
    passw_hash = hashlib.sha512(passw + user_salt).hexdigest()
    if passw_hash != user_hash:
      raise HTTPError(401, 'Invalid username or password.')

    # Generate a session token & map the user to it.
    yield self.login(user)



class LogoutHandler(APIHandler):
  """Handles requests to the REST API."""

  @session
  @coroutine
  def post(self, user):
    """Logs a user out by invalidating the session token."""

    token = self.get_secure_cookie('session')
    self.redis.delete('session:%s' % token, 'user_id')
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
           RETURNING id, first_name, last_name, email''', (
          firstName,
          lastName,
          email,
          pass_with_salt
    ))

    # Check if the user was created successfully.
    user = cursor.fetchone()
    if not user:
      raise HTTPError(400, 'Registration failed.')

    # Log the user in after registering.
    yield self.login(user)



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
    if not user:
      raise HTTPError(404, 'User does not exist.')
    self.write(json.dumps(user.__dict__))


class FacebookHandler(APIHandler, FacebookGraphMixin):
  """Exchanges a Facebook access token."""

  REDIRECT_URI = 'http://localhost:8000/api/user/auth/fb'

  @coroutine
  def get(self):
    """Redirects the user or handles the token."""

    if not self.get_argument('code', False):
      yield self.authorize_redirect(
          redirect_uri=self.REDIRECT_URI,
          client_id=self.settings['facebook_api_key'],
          extra_params={
            'scope': 'email'
          })
      return

    # Activate the token.
    current = yield self.get_authenticated_user(
        redirect_uri=self.REDIRECT_URI,
        client_id=self.settings['facebook_api_key'],
        client_secret=self.settings['facebook_secret'],
        code=self.get_argument('code'))

    # Check if a user with that ID already exists.
    cursor = yield momoko.Op(self.db.execute,
        '''SELECT id, first_name, last_name, email
           FROM users
           WHERE fb_id=%s''',
        (current['id'],))
    user = cursor.fetchone()

    # If the user never logged in, create an entry.
    if not user:
      user = yield self.facebook_request(
          '/me',
          access_token=current['access_token'])

      if 'email' in user:
        email = user['email']
      else:
        email = user['first_name'] + user['last_name']

      cursors = yield momoko.Op(self.db.transaction, (
          (
              '''UPDATE users SET fb_id=%s WHERE email=%s
                 RETURNING id, first_name, last_name, email;''',
              (user['id'], email)
          ),
          (
              '''INSERT INTO users (first_name, last_name, email, fb_id)
                 SELECT %s, %s, %s, %s
                 WHERE NOT EXISTS (SELECT 1 FROM users WHERE email=%s)
                 RETURNING id, first_name, last_name, email''',
              (
                user['first_name'],
                user['last_name'],
                email,
                user['id'],
                email
              )
          ),
      ))

      user = None
      for cursor in cursors:
        user = cursor.fetchone()
        if user: break

      if not user:
        raise HTTPError(400, 'Registration failed.')

    # Create a new session & attach the user.
    yield self.login(user)

    # Go back to the homepage.
    self.redirect('/')



class GoogleHandler(APIHandler, GoogleOAuth2Mixin):
  """Exchanges a Google access token."""

  REDIRECT_URI = 'http://localhost:8000/api/user/auth/gp'

  @coroutine
  def get(self):
    """Redirects the user or handles the token."""

    if not self.get_argument('code', False):
      yield self.authorize_redirect(
          redirect_uri=self.REDIRECT_URI,
          client_id=self.settings['google_oauth']['key'],
          scope=['profile', 'email'],
          response_type='code',
          extra_params={'approval_prompt': 'auto'})
      return

    # Exchange the code for a token.
    current = yield self.get_authenticated_user(
        redirect_uri=self.REDIRECT_URI,
        code=self.get_argument('code'))

    # Pull profile info.
    response = yield Task(self.get_auth_http_client().fetch,
        ('https://www.googleapis.com/plus/v1/people/me' +
          '?access_token=%s') %
        (current['access_token']))
    current = json.loads(response.body)

    # Check if a user with that ID already exists.
    cursor = yield momoko.Op(self.db.execute,
        '''SELECT id, first_name, last_name, email
           FROM users
           WHERE gp_id=%s''',
        (current['id'],))
    user = cursor.fetchone()

    # If the user never logged in, create an entry.
    if not user:
      if current['emails']:
        email = current['emails'][0]['value']
      else:
        email = current['name']['givenName'] + current['name']['familyName']
      cursors = yield momoko.Op(self.db.transaction, (
          (
              '''UPDATE users SET gp_id=%s WHERE email=%s
                 RETURNING id, first_name, last_name, email;''',
              (current['id'], email)
          ),
          (
              '''INSERT INTO users (first_name, last_name, email, gp_id)
                 SELECT %s, %s, %s, %s
                 WHERE NOT EXISTS (SELECT 1 FROM users WHERE email=%s)
                 RETURNING id, first_name, last_name, email''',
              (
                current['name']['givenName'],
                current['name']['familyName'],
                email,
                current['id'],
                email
              )
          ),
      ))

      user = None
      for cursor in cursors:
        user = cursor.fetchone()
        if user: break

      if not user:
        raise HTTPError(400, 'Registration failed.')

    # Create a new session & attach the user.
    yield self.login(user)

    # Go back to the homepage.
    self.redirect('/')