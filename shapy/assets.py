# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json

import momoko
from tornado.gen import coroutine
from tornado.web import HTTPError, asynchronous

from shapy.common import APIHandler, session


class DirectoryHandler(APIHandler):
  """Handles requests to the REST API."""

  @session
  @coroutine
  @asynchronous
  def get(self, assetNumber, user):
    if not user:
      raise HTTPError(401, 'User not logged in.')

    # Check if request is valid
    if assetNumber != '0':
      cursor = yield momoko.Op(self.db.execute,
          '''SELECT 1
             FROM assets
             WHERE id = %s
             AND owner = %s
             ''',
          (assetNumber, user.id))
      if not cursor.fetchone():
        raise HTTPError(400, 'Illegal request for assets.')


    # Fetch data from the database.
    if assetNumber == '0':
      cursor = yield momoko.Op(self.db.execute,
          '''SELECT id, name, type, preview
             FROM assets
             WHERE parent is NULL
             AND owner = %s
             ''',
           (user.id,))
    else:
      cursor = yield momoko.Op(self.db.execute,
          '''SELECT id, name, type, preview
             FROM assets
             WHERE parent = %s
             AND owner = %s
             ''',
         (assetNumber, user.id))

    # Return json with answer
    self.write(json.dumps([
        {
          'id': id,
          'name' : name,
          'type' : type,
          'preview' : preview
        }
        for (id, name, type, preview) in cursor.fetchall()
    ]))

    self.finish()
