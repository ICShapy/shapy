# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.



class Scene(object):
  """Class representing a whole scene."""

  class Object(object):
    """Class representing an object in a scene."""

    def __init__(self, data={}):
      """Initializes an empty object."""

      # Translation vector.
      self.tx = data.get('tx', 0.0)
      self.ty = data.get('ty', 0.0)
      self.tz = data.get('tz', 0.0)

      # Scaling vector.
      self.sx = data.get('sx', 1.0)
      self.sy = data.get('sy', 1.0)
      self.sz = data.get('sz', 1.0)

      # Rotation quaternion.
      self.rx = data.get('rx', 0.0)
      self.ry = data.get('ry', 0.0)
      self.rz = data.get('rz', 0.0)
      self.rw = data.get('rw', 0.0)

      # Map of vertices.
      self.verts = {}

      # Map of UVs.
      self.uvs = {}

      # Map of edges.
      self.edges = {}

      # Map of faces.
      self.faces = {}

    @property
    def __dict__(self):
      """Converts the object to a serializable dictionary."""
      return  {
        'tx': self.tx, 'ty': self.ty, 'tz': self.tz,
        'sx': self.sx, 'sy': self.sy, 'sz': self.sz,
        'rx': self.rx, 'ry': self.ry, 'rz': self.rz, 'rw': self.rw
      }


  def __init__(self, data={}):
    """Initializes an empty scene."""

    self.name = data.get('name', 'New Scene')
    self.objects = dict(
      (k, Scene.Object(v)) for k, v in (data['objects'] or {}).iteritems())


  @property
  def __dict__(self):
    """Converts the scene to a serializable dictionary."""
    return {
      'name': self.name,
      'objects': dict((k, v.__dict__) for k, v in self.objects.iteritems())
    }


  @classmethod
  def new(cls):
    """Creates a new empty scene."""
    return Scene({
      'name': 'New Scene',
      'objects': {
        'obj_0': {
        }
      }
    })
