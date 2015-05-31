# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json

import momoko
from tornado.gen import coroutine
from tornado.web import HTTPError, asynchronous

from shapy.common import APIHandler, session


class DirHandler(APIHandler):
  """Handles requests to a directory resource."""

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

  @session
  @coroutine
  @asynchronous
  def delete(self, user):
    """Deletes a directory resource."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in.')
    if not id:
      raise HTTPError(404, 'Directory does not exist.')

    # Delete folder entry.
    yield momoko.Op(self.db.execute,
      '''DELETE
         FROM assets
         WHERE id = %s
           AND type = %s
      ''', (
      id,
      'dir'
    ))

    self.finish()

  @session
  @coroutine
  @asynchronous
  def put(self, user):
    """Updates a directory resource."""

    # Validate arguments.
    if not user:
      raise HTTPError(401, 'User not logged in.')
    id = int(self.get_argument('id'))
    name = self.get_argument('name')

    # Update the name.
    yield momoko.Op(self.db.execute,
      '''UPDATE assets SET name = %s WHERE id = %s''', (name, id)
    )
    self.finish()


class SceneHandler(APIHandler):
  """Handles requests to a scene asset."""


class TextureHandler(APIHandler):
  """Handles requests to a texture asset."""

