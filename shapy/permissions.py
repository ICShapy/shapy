# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import json

import momoko
from tornado.gen import coroutine
from tornado.web import HTTPError, asynchronous

from shapy.common import APIHandler, session


class PermissionsHandler(APIHandler):
  """Handles requests regarding asset permissions."""

  @session
  @coroutine
  @asynchronous
  def get(self, user = None):
    # Validate arguments.
    if not user:
      raise HTTPError(401, 'Not authorized.')

    # Return JSON answer.
    self.write(json.dumps({
      'available': ['mich.sienkiewicz@gazeta.pl',
                    'mich.sienkiewicz@gmail.com',
                    'ilija.radosavovic@gmail.com',
                    'trelemorele@gmail.com'],
      'shared': [{'email': 'mich.sienkiewicz@gazeta.pl', 'write': True} for i in range(7)] +
                [{'email': 'mich.sienkiewicz@gazeta.pl', 'write': False} for i in range(7)]
    }))
    self.finish()
