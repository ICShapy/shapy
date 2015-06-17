# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json

import momoko
import psycopg2
from tornado.gen import Return, coroutine
from tornado.web import HTTPError, asynchronous

from PIL import Image
import re
import cStringIO
import base64

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
      raise HTTPError(401, 'Not authorized')
    id = int(self.get_argument('id'))
    if not id:
      raise HTTPError(404, 'Asset does not exist')
    if id != -2:
      raise HTTPError(404, 'Incorrect shared space id')

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
          'owner': item[4] == int(user.id),
          'public': item[5],
          'write': item[6]
        }
        for item in cursor.fetchall()
      ]
    })
    self.finish()



class FilteredHandler(APIHandler):
  """Handles requests to filtered space."""

  @session
  @coroutine
  @asynchronous
  def get(self, user = None):

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'Not authorized')
    id = int(self.get_argument('id'))
    if not id:
      raise HTTPError(404, 'Asset does not exist')
    if id == -3:
      type = 'texture'
      name = 'Textures'
    elif id == -4:
      type = 'scene'
      name = 'Scenes'
    else:
      raise HTTPError(404, 'Incorrect filter id')

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
          'public': item[4],
          'owner': True,
          'write': True
        }
        for item in cursor.fetchall()
      ]
    })
    self.finish()



class AssetHandler(APIHandler):
  """Handles common requests to assets."""

  TYPE = None
  NEW_NAME = None

  def _generate_preview(self, data):
    """Generates a preview image."""
    return None


  @coroutine
  def _fetch(self, id, user):
    """Retrieves an asset from the database."""

    # Fetch data from the asset and permission table.
    # The write flag will have 3 possible values: None, True, False
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT id, name, preview::bytea, data::bytea, public, owner, write
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
    if not data:
      raise HTTPError(404, 'Asset not found')

    if user and data['owner'] == user.id:
      # Owner - full permissions.
      owner = True
      write = True
    elif data['write'] is None:
      if not data['public']:
        # No permissions.
        raise HTTPError(400, 'Asset not found')
      else:
        # Public asset - read only.
        owner = False
        write = False
    else:
      # Shared asset - permission in table.
      owner = False
      write = user is not None and data['write']

    raise Return((data, owner, write))


  @session
  @coroutine
  @asynchronous
  def get(self, user):
    """Retrieves an asset from the database."""

    id = self.get_argument('id')
    if not id:
      raise HTTPError(400, 'Missing asset ID')

    data, owner, write = yield self._fetch(id, user)

    # Dump JSON formatted data.
    self.write_json({
        'id': data['id'],
        'name': data['name'],
        'preview': str(data['preview'] or ''),
        'data': str(data['data'] or '') if self.TYPE == 'texture'
                else json.loads(str(data['data'] or 'null')),
        'public': data['public'],
        'owner': owner,
        'write': write,
        'owner_id': data['owner']
    })
    self.finish()


  @session
  @coroutine
  @asynchronous
  def post(self, user=None):
    """Creates a new asset."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in')
    parent = int(self.get_argument('parent'))
    preview = self.get_argument('preview', None)
    mainData = self.get_argument('data', None)
    name = self.get_argument('name', None)
    if preview is None and mainData is not None:
      preview = self._generate_preview(mainData)

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
        raise HTTPError(404, 'Parent directory does not exist')

    # Create new asset - store in database
    cursor = yield momoko.Op(self.db.execute,
      '''INSERT INTO assets (name, type, data, preview, owner, parent, public)
         VALUES (
            %(name)s,
            %(type)s,
            %(data)s,
            %(preview)s,
            %(owner)s,
            %(parent)s,
            %(public)s
         )
         RETURNING id, name
      ''', {
      'name': name or self.NEW_NAME,
      'type': self.TYPE,
      'data': psycopg2.Binary(str(mainData)) if mainData else None,
      'preview': psycopg2.Binary(str(preview)) if preview else None,
      'owner': user.id,
      'parent': parent,
      'public': False
    })

    # Check if the asset was created successfully.
    data = cursor.fetchone()
    if not data:
      raise HTTPError(400, 'Asset creation failed')

    # Return the asset data.
    self.write_json({
        'id': data[0],
        'name': data[1],
        'owner': True,
        'write': True,
        'public': False,
        'preview': preview,
        'data': []
    })
    self.finish()


  @session
  @coroutine
  @asynchronous
  def delete(self, user):
    """Deletes an asset."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in')
    id = int(self.get_argument('id'))
    if not id:
      raise HTTPError(404, 'Asset does not exist')
    if id <= 0:
      raise HTTPError(404, 'Asset does not exist')

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
      raise HTTPError(400, 'Asset deletion failed')

    self.finish()

  @session
  @coroutine
  @asynchronous
  def put(self, user):
    """Updates a resource."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in')
    id = int(self.get_argument('id'))
    name = self.get_argument('name', None)
    parent = self.get_argument('parent', None)
    data = self.get_argument('data', None)
    preview = self.get_argument('preview', None)
    public = self.get_argument('public', None)
    if public is not None:
      public = bool(int(public))

    # Block changing public setting of a dir
    if public is not None and self.TYPE == 'dir':
      raise HTTPError(400, 'Asset update failed')

    if parent == id:
      raise HTTPError(400, 'Cannot move a directory into itself')

    if parent is not None:
      # Check ownership of asset and potential new parent
      cursors = yield momoko.Op(self.db.transaction, (
      (
      '''SELECT 1
         FROM assets
         WHERE id = %(id)s
           AND owner = %(owner)s
           AND type = %(type)s
      ''', {
          'id': id,
          'owner': user.id,
          'type': self.TYPE,
      }),
      (
      '''SELECT 1
         FROM assets
         WHERE id = %(parent)s
           AND (id = 0 OR owner = %(owner)s)
           AND type = %(type)s
      ''',{
          'parent': parent,
          'owner': user.id,
          'type': 'dir',
      })
      ))

      if not cursors[0].fetchone() or not cursors[1].fetchone():
        raise HTTPError(400, 'Asset cannot be edited that way')

    else:
      # Check if user has write permission
      cursor = yield momoko.Op(self.db.execute,
        '''SELECT 1
           FROM assets
           LEFT OUTER JOIN permissions
           ON permissions.asset_id = assets.id
           WHERE assets.id = %(id)s
             AND assets.type = %(type)s
             AND ((permissions.user_id = %(user)s AND
                   permissions.write IS TRUE AND
                   %(public)s IS NULL) OR
                  (assets.owner = %(user)s))
        ''', {
        'id': id,
        'type': self.TYPE,
        'user': user.id,
        'public': public
      })

      if not cursor.fetchone():
        raise HTTPError(400, 'Asset cannot be edited')

    # Try generating a preview.
    if preview is None and data is not None:
      preview = self._generate_preview(data)

    # Update
    cursor = yield momoko.Op(self.db.execute,
      '''UPDATE assets
         SET name = COALESCE(%(name)s, name),
             data = COALESCE(%(data)s, data)::bytea,
             public = COALESCE(%(public)s, public),
             preview = COALESCE(%(preview)s, preview)::bytea,
             parent = COALESCE(%(parent)s, parent)

         WHERE id = %(id)s
         RETURNING id
      ''', {
      'id': id,
      'name': name,
      'data': psycopg2.Binary(data.encode('ascii')) if data else None,
      'public': public,
      'preview': psycopg2.Binary(str(preview)) if preview else None,
      'parent': parent
    })

    if not cursor.fetchone():
      raise HTTPErorr(400, 'Asset update failed.')

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
      raise HTTPError(401, 'Not authorized')

    # Reject IDs of not private dir
    if id < 0:
      raise HTTPError(404, 'Directory does not exist')
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
        raise HTTPError(404, 'Directory does not exist')
    else:
      # Otherwise, fetch home directory.
      data = (0, 'home')

    # Fetch information about children.
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT id, name, type, preview, public, owner
         FROM assets
         WHERE parent = %s
           AND owner = %s
      ''', (
      data[0],
      user.id
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
          'id': item['id'],
          'name': item['name'],
          'type': item['type'],
          'preview': str(item[3]) if item[3] else '',
          'public': item[4],
          'owner': True,
          'write': True,
          'owner_id': item['owner']
        }
        for item in cursor.fetchall()
      ]
    })
    self.finish()


class TextureHandler(AssetHandler):
  """Handles requests to a texture asset."""

  TYPE = 'texture'
  NEW_NAME = 'New Texture'

  def _generate_preview(self, data):
    """Generates a preview image."""
    b64data = re.sub('^data:image/.+;base64,', '', str(data))

    im = Image.open(cStringIO.StringIO(b64data.decode('base64')))
    im = im.convert('RGB')
    im.thumbnail((150, 150), Image.ANTIALIAS)

    stream = cStringIO.StringIO()
    im.save(stream, format='JPEG')
    return 'data:image/jpeg;base64,%s' % base64.b64encode(stream.getvalue())

  @session
  @coroutine
  @asynchronous
  def get(self, user):
    """Fetches a scene either as JSON or some other format."""

    # If format is unspecified, dump as JSON.
    fmt = self.get_argument('format', None)
    if not fmt or fmt == 'json':
      yield super(TextureHandler, self).get()
      return

    # Decode image.
    data, _, _ = yield self._fetch(self.get_argument('id'), user)
    image = Image.open(cStringIO.StringIO(re.sub(
        '^data:image/.+;base64,', '', data['data']).decode('base64')))
    stream = cStringIO.StringIO()

    if fmt == 'png':
      self.set_header('Content-Type', 'image/png')
      image.save(stream, 'png')
    elif fmt == 'jpeg':
      self.set_header('Content-Type', 'image/jpeg')
      image.save(stream, 'jpeg')
    else:
      raise HTTPError(400, 'Unsupported image format')

    data = stream.getvalue()
    self.set_header('Content-Length', str(len(data)))
    self.write(data)
    self.finish()




class SceneHandler(AssetHandler):
  """Handles requests to a texture asset."""

  TYPE = 'scene'
  NEW_NAME = 'New Scene'

  @session
  @coroutine
  @asynchronous
  def get(self, user):
    """Fetches a scene either as JSON or some other format."""

    fmt = self.get_argument('format', None)
    if not fmt or fmt == 'json':
      yield super(SceneHandler, self).get()
      return

    data, _, _ = yield self._fetch(self.get_argument('id'), user)
    scene = Scene(data['name'], json.loads(str(data['data'] or 'null')))

    if fmt == 'obj':
      self.set_header('Content-Type', 'text/plain')
      self.write(scene.to_obj())
    elif fmt == 'stl':
      self.set_header('Content-Type', 'text/plain')
      self.write(scene.to_stl())
    else:
      raise HTTPError(400, 'Format not supported')

    self.finish()


class TextureFilterHandler(APIHandler):
  """Handles a request to multiple textures."""

  @session
  @coroutine
  @asynchronous
  def get(self, user):
    """Filters textures by a query string."""

    # Retrieve textures.
    name = self.get_argument('name', '')
    cursor = yield momoko.Op(self.db.execute,
      '''SELECT id, name, preview
         FROM assets
         LEFT OUTER JOIN permissions ON permissions.asset_id = assets.id
         WHERE assets.type = %(type)s
           AND LOWER(assets.name) LIKE LOWER(%(name)s)
           AND (permissions.user_id = %(user)s
                OR assets.public is TRUE
                OR assets.owner = %(user)s)
         LIMIT 5
      ''', {
      'type': 'texture',
      'name': name + '%',
      'user': user.id if user else None
    })

    self.write_json([
      {
        'id': asset['id'],
        'name': asset['name'],
        'preview': str(asset['preview'])
      }
      for asset in cursor.fetchall()
    ])
    self.finish()