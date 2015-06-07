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
    id = int(self.get_argument('id'))

    # Check if user owns a non-dir asset with given id
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT 1
         FROM assets
         WHERE type <> %s
           AND owner = %s
           AND id = %s
      ''', (
      'dir',
      user.id,
      id
    ))
    data = cursor.fetchone()
    if not data:
        raise HTTPError(404, 'Asset not owned by user.')

    # Fetch available emails and permissions currently granted
    cursors = yield momoko.Op(self.db.transaction, (
    (
    '''SELECT email
       FROM users
    '''
    ),
    (
    '''SELECT users.email, permissions.write
       FROM users
       INNER JOIN permissions
       ON users.id = permissions.user_id
       WHERE permissions.asset_id = %s
    ''',
      (
        id,
      )
    )
    ))

    # Return JSON answer.
    self.write(json.dumps({
      'available': [item[0] for item in cursors[0].fetchall()],
      'shared': [{'email': item[0], 'write': item[1]} for item in cursors[1].fetchall()]
    }))
    self.finish()
