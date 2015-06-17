# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import json

import momoko
from tornado.gen import coroutine
from tornado.web import HTTPError, asynchronous

from shapy.account import Account
from shapy.common import APIHandler, BaseHandler, session



class PublicHandler(APIHandler):
  """Handles requests to public space."""

  @session
  @coroutine
  @asynchronous
  def get(self, user = None):
    """Retrieves the public space."""
    # Validate arguments.
    if not user:
      # Set special id for not logged in users
      user = Account(-1)

    # Initialise public space data.
    data = (-1, 'Public')

    #Fetch assets shared with user with write perm.
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT asset_id
         FROM permissions
         WHERE user_id = %s
           AND write = %s
      ''', (
      user.id,
      True
    ))

    assetsWrite =[asset[0] for asset in cursor.fetchall()]

    # Fetch information about public assets.
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT assets.id, assets.name, assets.type, assets.preview,
                assets.owner, users.email
         FROM assets
         INNER JOIN users
         ON assets.owner = users.id
         WHERE public = %s
      ''', (
      True,
    ))

    # Return JSON answer.
    self.write_json({
      'id': data[0],
      'name': data[1],
      'owner': True,
      'write': True,
      'public': False,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': str(item[3]) if item[3] else '',
          'public': True,
          'owner': item[4] == int(user.id),
          'write': item[4] == int(user.id) or item[0] in assetsWrite,
          'email': 'You' if item[4] == int(user.id) else item[5]
        }
        for item in cursor.fetchall()
      ]
    })
    self.finish()
