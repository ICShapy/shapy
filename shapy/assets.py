# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json

import momoko
from tornado.gen import coroutine
from tornado.web import HTTPError, asynchronous

from shapy.common import APIHandler, session
from shapy.account import Account


class SharedHandler(APIHandler):
  """Handles requests to shared space."""

  @session
  @coroutine
  @asynchronous
  def get(self, user = None):

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'Not authorized.')
    id = int(self.get_argument('id'))
    if not id:
      raise HTTPError(404, 'Asset does not exist.')
    if id != -2:
      raise HTTPError(404, 'Incorrect shared space id.')

    # Initialise filtered space data.
    data = (id, 'Shared')

    # Fetch information about children.
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT assets.id, assets.name, assets.type, assets.preview,
                assets.owner, permissions.write
         FROM assets
         INNER JOIN permissions
         ON assets.id = permissions.asset_id
         WHERE permissions.user_id = %s
      ''', (
      user.id,
    ))

    # Return JSON answer.
    self.write(json.dumps({
      'id': data[0],
      'name': data[1],
      'owner': True,
      'write': True,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': item[3],
          'owner': item[4] == int(user.id),
          'write': item[5]
        }
        for item in cursor.fetchall()
      ]
    }))
    self.finish()



class FilteredHandler(APIHandler):
  """Handles requests to filtered space."""

  @session
  @coroutine
  @asynchronous
  def get(self, user = None):

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'Not authorized.')
    id = int(self.get_argument('id'))
    if not id:
      raise HTTPError(404, 'Asset does not exist.')
    if id == -3:
      type = 'texture'
      name = 'Textures'
    elif id == -4:
      type = 'scene'
      name = 'Scenes'
    else:
      raise HTTPError(404, 'Incorrect filter id.')

    # Initialise filtered space data.
    data = (id, name)

    # Fetch information about children.
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT id, name, type, preview
         FROM assets
         WHERE type = %s
           AND owner = %s
      ''', (
      type,
      user.id
    ))

    # Return JSON answer.
    self.write(json.dumps({
      'id': data[0],
      'name': data[1],
      'owner': True,
      'write': True,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': item[3],
          'owner': True,
          'write': True
        }
        for item in cursor.fetchall()
      ]
    }))
    self.finish()


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
      '''SELECT id, name, type, preview, owner
         FROM assets
         WHERE public = %s
      ''', (
      True,
    ))

    # Return JSON answer.
    self.write(json.dumps({
      'id': data[0],
      'name': data[1],
      'owner': True,
      'write': True,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': item[3],
          'owner': item[4] == int(user.id),
          'write': item[4] == int(user.id) or item[0] in assetsWrite
        }
        for item in cursor.fetchall()
      ]
    }))
    self.finish()



class AssetHandler(APIHandler):
  """Handles common requests to assets."""

  TYPE = None
  NEW_NAME = None

  @session
  @coroutine
  @asynchronous
  def post(self, user=None):
    """Creates a new scene."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in.')
    parent = int(self.get_argument('parent'))
    preview = self.get_argument('preview', None)
    mainData = self.get_argument('data', None)
    # Reject parent dirs not owned by user
    if parent != 0:
      cursor = yield momoko.Op(self.db.execute,
        '''SELECT id, name
           FROM assets
           WHERE id = %s
             AND type = %s
             AND owner = %s
        ''', (
        parent,
        'dir',
        user.id
      ))
      data = cursor.fetchone()
      if not data:
        raise HTTPError(404, 'Parent directory does not exist.')

    # Create new asset - store in database
    cursor = yield momoko.Op(self.db.execute,
      '''INSERT INTO assets (name, type, preview, data, owner, parent, public)
         VALUES (%s, %s, %s, %s, %s, %s, %s)
         RETURNING id, name
      ''', (
      self.NEW_NAME,
      self.TYPE,
      preview,
      mainData,
      user.id,
      parent,
      False
    ))

    # Check if the asset was created successfully.
    data = cursor.fetchone()
    if not data:
      raise HTTPError(400, 'Asset creation failed.')

    # Return the asset data.
    self.write(json.dumps({
        'id': data[0],
        'name': data[1],
        'owner': True,
        'write': True,
        'data': []
    }))
    self.finish()


  @session
  @coroutine
  @asynchronous
  def delete(self, user):
    """Deletes an asset."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in.')
    id = int(self.get_argument('id'))
    if not id:
      raise HTTPError(404, 'Asset does not exist.')
    if id <= 0:
      raise HTTPError(404, 'Asset does not exist.')

    # Delete folder entry.
    cursor = yield momoko.Op(self.db.execute,
      '''DELETE
         FROM assets
         WHERE id = %s
           AND type = %s
           AND owner = %s
         RETURNING id
      ''', (
      id,
      self.TYPE,
      user.id
    ))

    # Check if deletion successful
    data = cursor.fetchone()
    if not data:
      raise HTTPError(400, 'Asset deletion failed.')

    self.finish()

  @session
  @coroutine
  @asynchronous
  def put(self, user):
    """Updates a resource."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in.')
    id = int(self.get_argument('id'))
    name = self.get_argument('name')

    # Check if user has write permission
    cursors = yield momoko.Op(self.db.transaction, (
      (
      '''SELECT 1
         FROM assets
         WHERE id = %s
           AND owner = %s
      ''',
        (
          id,
          user.id,
        )
      ),
      (
      '''SELECT 1
         FROM permissions
         WHERE user_id = %s
           AND asset_id = %s
           AND write = %s
      ''',
        (
          user.id,
          id,
          True,
        )
      )
      ))

    if not cursors[0].fetchone() and not cursors[1].fetchone():
      raise HTTPError(400, 'Asset update failed.')

    # Update the name.
    cursor = yield momoko.Op(self.db.execute,
      '''UPDATE assets
         SET name = %s
         WHERE id = %s
           AND type = %s
         RETURNING id
      ''', (
      name,
      id,
      self.TYPE
      ))

    # Check if update successful
    data = cursor.fetchone()
    if not data:
      raise HTTPError(400, 'Asset update failed.')

    self.finish()



class DirHandler(AssetHandler):
  """Handles requests to a directory resource."""

  TYPE = 'dir'
  NEW_NAME = 'New Folder'

  @session
  @coroutine
  @asynchronous
  def get(self, user = None):
    """Retrieves the specified directory."""

    # Validate arguments.
    id = int(self.get_argument('id'))
    if not user:
      raise HTTPError(401, 'Not authorized.')

    # Reject IDs of not private dir
    if id < 0:
      raise HTTPError(404, 'Directory does not exist.')
    if id:
      # If ID is not 0, retrieve information about a directory.
      cursor = yield momoko.Op(self.db.execute,
        '''SELECT id, name
           FROM assets
           WHERE id = %s
             AND type = %s
             AND owner = %s
        ''', (
        id,
        'dir',
        user.id
      ))

      # See if resource exists.
      data = cursor.fetchone()
      if not data:
        raise HTTPError(404, 'Directory does not exist.')
    else:
      # Otherwise, fetch home directory.
      data = (0, 'home')

    # Fetch information about children.
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT id, name, type, preview
         FROM assets
         WHERE parent = %s
           AND owner = %s
      ''', (
      data[0],
      user.id
    ))

    # Return JSON answer.
    self.write(json.dumps({
      'id': data[0],
      'name': data[1],
      'owner': True,
      'write': True,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': item[3],
          'owner': True,
          'write': True
        }
        for item in cursor.fetchall()
      ]
    }))
    self.finish()



class SceneHandler(AssetHandler):
  """Handles requests to a scene asset."""

  TYPE = 'scene'
  NEW_NAME = 'New Scene'

  @session
  @coroutine
  @asynchronous
  def get(self, user):
    """Retrieves a scene from the database."""

    # Validate arguments.
    if not user:
      # Set special id for not logged in users
      user = Account(-1)
    id = int(self.get_argument('id'))

    # Fetch asset data.
    cursors = yield momoko.Op(self.db.transaction, (
      (
        '''SELECT id, name, preview, data, public, owner
           FROM assets
           WHERE id = %s
             AND type = %s
        ''',
        (
          id,
          self.TYPE
        )
      ),
      (
        '''SELECT write
           FROM permissions
           WHERE user_id = %s
             AND asset_id = %s
        ''',
        (
          user.id,
          id
        )
      )
    ))

    dataAssets = cursors[0].fetchone()
    dataPerm = cursors[1].fetchone()

    if not dataAssets:
      raise HTTPError(404, 'Scene not found.')

    if dataAssets[5] == int(user.id):
      # User is owner
      owner = True
      write = True
    elif dataPerm:
      # User shares asset with owner
      owner = False
      write = dataPerm[0]
    elif dataAssets[4]:
      # Just read perm. as asset public
      owner = False
      write = False
    else:
      # Illegal access
      raise HTTPError(400, 'Asset access not granted.')

    self.write(json.dumps({
        'id': dataAssets[0],
        'name': dataAssets[1],
        'preview': dataAssets[2],
        'data': dataAssets[3],
        'owner': owner,
        'write': write
    }))
    self.finish()



class TextureHandler(AssetHandler):
  """Handles requests to a texture asset."""

  TYPE = 'texture'
  NEW_NAME = 'New Texture'
