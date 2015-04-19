# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

from common import APIHandler



class AuthHandler(APIHandler):
  """Handles requests to the REST API."""

  def get(self):
    self.write('a')
    print 'get'



class LoginHandler(APIHandler):
  """Handles requests to the REST API."""



class LogoutHandler(APIHandler):
  """Handles requests to the REST API."""



class RegisterHandler(APIHandler):
  """Handles requests to the REST API."""
