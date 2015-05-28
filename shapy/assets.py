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
  def get(self, assetNumber, public, user):
    if not user:
      raise HTTPError(401, 'User not logged in.')

    # Convert from binary
    public = (public == 1)

    # Check if public space queried correctly
    if public and assetNumber != '0':
      raise HTTPError(400, 'There are no subdirs in public space.')

    # Check if request is valid - can only browse home ('0')
    # or existing dir.
    if assetNumber != '0':
      cursor = yield momoko.Op(self.db.execute,
          '''SELECT 1
             FROM assets
             WHERE id = %s
             AND owner = %s
             AND public = %s
             ''',
          (assetNumber, user.id, public))
      if not cursor.fetchone():
        raise HTTPError(400, 'Illegal request for assets.')


    # Fetch data from the database.
    cursor = yield momoko.Op(self.db.execute,
        '''SELECT id, name, type, preview
           FROM assets
           WHERE parent = %s
           AND owner = %s
           AND public = %s
           ''',
       (assetNumber, user.id, public))

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



class AssetCreationHandler(APIHandler):
  """Handles requests to the REST API."""

  @session
  @coroutine
  @asynchronous
  def post(self, user):
    if not user:
      raise HTTPError(401, 'User not logged in.')

    # Retrieve asset data.
    req     = json.loads(self.request.body)
    name    = req['name'] if 'name' in req else None
    type    = req['type'] if 'type' in req else None
    data    = req['data'] if 'data' in req else None
    preview = req['preview'] if 'preview' in req else None
    public  = req['public'] if 'public' in req else None
    parent  = req['parent'] if 'parent' in req else None

    # Check if required data specified
    if not name or not type or public is None or parent is None:
      raise HTTPError(400, 'Missing asset data, cannot create asset.')

    # Create new account - store in database
    cursor = yield momoko.Op(self.db.execute,
        '''INSERT INTO assets (id, name, type, data, preview, public, owner, parent)
           VALUES (DEFAULT, %s, %s, %s, %s, %s, %s, %s)
           RETURNING id''', (
           name, 
           type, 
           data, 
           preview, 
           public, 
           user.id, 
           parent
    ))

    # Check if the user was created successfully.
    asset = cursor.fetchone()
    if not asset:
      raise HTTPError(400, 'Asset creation failed.')

    #return id
    self.write(json.dumps({ 'id' : asset[0]}))
    self.finish()

