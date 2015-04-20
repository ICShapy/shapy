# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

from common import APIHandler, authenticated
from tornado.gen import coroutine


class AuthHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  @authenticated
  def get(self):
    pass



class LoginHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  def post(self):
    pass



class LogoutHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  @authenticated
  def post(self):
    pass



class RegisterHandler(APIHandler):
  """Handles requests to the REST API."""

  @coroutine
  def post(self):
    pass

