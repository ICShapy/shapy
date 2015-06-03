# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json

import momoko
from tornado.gen import coroutine
from tornado.web import HTTPError, asynchronous

from shapy.common import APIHandler, session


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
    if id >= 0:
      raise HTTPError(404, 'Incorrect filter id.')

    # Initialise filtered space data.
    data = (id, 'filter')

    # Return JSON answer.
    self.write(json.dumps({
      'id': data[0],
      'name': data[1],
      'data': []
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
      raise HTTPError(401, 'Not authorized.')

    # Initialise public space data.
    data = (-1, 'publicHome')

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
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': item[3]
        }
        for item in cursor.fetchall()
      ]
    }))
    self.finish()



class AssetHandler(APIHandler):
  """Handles common requests to assets."""

  TYPE = None

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
    """Updates a scene resource."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in.')
    id = int(self.get_argument('id'))
    name = self.get_argument('name')

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

  @session
  @coroutine
  @asynchronous
  def get(self, user = None):
    """Retrieves the specified directory."""

    # Validate arguments.
    id = int(self.get_argument('id'))
    if not user:
      raise HTTPError(401, 'Not authorized.')

    if id:
      # If ID is not 0, retrieve information about a directory.
      cursor = yield momoko.Op(self.db.execute,
        '''SELECT id, name
           FROM assets
           WHERE id = %s
             AND type = %s
        ''', (
        id,
        'dir'
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
      'data': [
        {
          'id': item[0],
          'name': item[1],
          'type': item[2],
          'preview': item[3]
        }
        for item in cursor.fetchall()
      ]
    }))
    self.finish()


  @session
  @coroutine
  @asynchronous
  def post(self, user=None):
    """Creates a new directory."""

    # Validate arguments.
    parent = self.get_argument('parent')
    if not user:
      raise HTTPError(401, 'User not logged in.')

    # Create new account - store in database
    cursor = yield momoko.Op(self.db.execute,
      '''INSERT INTO assets (name, type, owner, parent, public)
         VALUES (%s, %s, %s, %s, %s)
         RETURNING id, name
      ''', (
      'New Folder',
      'dir',
      user.id,
      parent,
      False
    ))

    # Check if the directory was created successfully.
    data = cursor.fetchone()
    if not data:
      raise HTTPError(400, 'Asset creation failed.')

    # Return the asset data.
    self.write(json.dumps({
        'id': data[0],
        'name': data[1],
        'data': []
    }))
    self.finish()



class SceneHandler(AssetHandler):
  """Handles requests to a scene asset."""

  TYPE = 'scene'

  @session
  @coroutine
  @asynchronous
  def get(self, user):
    """Retrieves a scene from the database."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in.')
    id = int(self.get_argument('id'))

    cursor = yield momoko.Op(self.db.execute,
      '''SELECT id, name
         FROM assets
         WHERE id = %s
           AND type = %s
      ''', (
      id,
      'scene'
    ))

    data = cursor.fetchone()
    if not data:
      raise HTTPError(404, 'Scene not found.')

    self.write(json.dumps({
        'id': data[0],
        'name': data[1],
    }))
    self.finish()


  @session
  @coroutine
  @asynchronous
  def post(self, user=None):
    """Creates a new scene."""

    # Validate arguments.
    parent = self.get_argument('parent')
    if not user:
      raise HTTPError(401, 'User not logged in.')

    # Create new account - store in database
    cursor = yield momoko.Op(self.db.execute,
      '''INSERT INTO assets (name, type, data, owner, parent, public)
         VALUES (%s, %s, %s, %s, %s, %s)
         RETURNING id, name, data
      ''', (
      'New Scene',
      'scene',
      '{}',
      user.id,
      parent,
      False
    ))

    # Check if the scene was created successfully.
    data = cursor.fetchone()
    if not data:
      raise HTTPError(400, 'Asset creation failed.')

    # Return the asset data.
    self.write(json.dumps({
        'id': data[0],
        'name': data[1],
        'data': []
    }))
    self.finish()



class TextureHandler(AssetHandler):
  """Handles requests to a texture asset."""

  TYPE = 'texture'
