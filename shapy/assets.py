# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

from binascii import a2b_base64
import hashlib
import json

import momoko
import psycopg2
from tornado.gen import coroutine
from tornado.web import HTTPError, asynchronous

from shapy.account import Account
from shapy.common import APIHandler, BaseHandler, session
from shapy.scene import Scene



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
                assets.owner, assets.public, permissions.write
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
      'public': False,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': str(item[3]) if item[3] else '',
          'owner': item[4] == int(user.id),
          'public': item[5],
          'write': item[6]
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
      '''SELECT id, name, type, preview, public
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
      'public': False,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': str(item[3]) if item[3] else '',
          'public': item[4],
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
      'public': False,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': str(item[3]) if item[3] else '',
          'public': True,
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
    """Creates a new asset."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in.')
    parent = int(self.get_argument('parent'))
    preview = None
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
      '''INSERT INTO assets (name, type, owner, parent, public)
         VALUES (%s, %s, %s, %s, %s)
         RETURNING id, name
      ''', (
      self.NEW_NAME,
      self.TYPE,
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
        'public': False,
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
    name = self.get_argument('name', None)
    data = self.get_argument('data', None)
    public = self.get_argument('public', None)
    if public is not None:
      public = bool(int(public))

    # Block changing public setting of a dir
    if public is not None and self.TYPE == 'dir':
      raise HTTPError(400, 'Asset update failed.')

    # Check if user has write permission
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT 1
         FROM assets
         LEFT OUTER JOIN permissions
         ON permissions.asset_id = assets.id
         WHERE assets.id = %(id)s
           AND ((permissions.user_id = %(user)s AND
                 permissions.write IS TRUE AND
                 %(public)s IS NULL) OR
                (assets.owner = %(user)s))
      ''', {
      'id': id,
      'user': user.id,
      'public': public
    })

    if not cursor.fetchone():
      raise HTTPErorr(400, 'Asset cannot be edited.')

    cursor = yield momoko.Op(self.db.execute,
      '''UPDATE assets
         SET name = COALESCE(%(name)s, name),
             data = COALESCE(%(data)s, data),
             public = COALESCE(%(public)s, public)
         WHERE id = %(id)s
         RETURNING id
      ''', {
      'id': id,
      'name': name,
      'data': psycopg2.extras.Json(data) if data else None,
      'public': public
    })

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
      '''SELECT id, name, type, preview, public
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
      'public': False,
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': str(item[3]) if item[3] else '',
          'public': item[4],
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

    id = self.get_argument('id')
    if not id:
      raise HTTPError(400, 'Invalid asset ID')

    # Fetch data from the asset and permission table.
    # The write flag will have 3 possible values: None, True, False
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT id, name, preview, data::json, public, owner, write
         FROM assets
         LEFT OUTER JOIN permissions
         ON permissions.asset_id = assets.id
         WHERE assets.id = %(id)s
           AND assets.type = %(type)s
           AND (permissions.user_id = %(user)s OR
                permissions.user_id is NULL OR
                %(user)s IS NULL)
      ''', {
        'id': id,
        'user': user.id if user else None,
        'type': self.TYPE
    })

    data = cursor.fetchone()
    print data
    if not data:
      raise HTTPError(404, 'Asset not found.')

    if user and data['owner'] == user.id:
      # Owner - full permissions.
      owner = True
      write = True
    elif data['write'] is None:
      if not data['public']:
        # No permissions.
        raise HTTPError(400, 'Asset not found.')
      else:
        # Public asset - read only.
        owner = False
        write = False
    else:
      # Shared asset - permission in table.
      owner = False
      write = user is not None and data['write']

    self.write(json.dumps({
        'id': data['id'],
        'name': data['name'],
        'preview': str(data['preview'] or ''),
        'data': json.loads(data['data'] or 'null'),
        'public': data['public'],
        'owner': owner,
        'write': write
    }))
    self.finish()



class TextureHandler(AssetHandler):
  """Handles requests to a texture asset."""

  TYPE = 'texture'
  NEW_NAME = 'New Texture'



class PreviewHandler(BaseHandler):
  """Handles a preview image upload."""

  @coroutine
  @asynchronous
  def get(self):
    """Retrieves the preview of the scene."""

    data = yield momoko.Op(self.db.execute,
        '''SELECT preview::bytea
           FROM assets
           WHERE id=%s
        ''', (
        self.get_argument('id'),
    ))
    data = data.fetchone()
    if not data:
      raise HTTPError(404, 'Preview not found')

    image = a2b_base64(str(data[0])[23:])
    self.set_header('Content-Type', 'image/jpeg')
    self.set_header('Content-Length', len(image))
    self.write(image)
    self.finish()


  @session
  @coroutine
  @asynchronous
  def post(self, user):
    """Updates the preview image of a scene."""

    if not user:
      return

    yield momoko.Op(self.db.execute,
      '''UPDATE assets
         SET preview=%s::bytea
         WHERE id=%s
           AND owner=%s
      ''', (
      psycopg2.Binary(self.request.body),
      self.get_argument('id'),
      user.id
    ))

    self.finish()
