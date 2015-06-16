# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import StringIO
from pyrr.objects import Quaternion, Matrix44, Vector3, Vector4


class Scene(object):
  """Class representing a whole scene."""

  class Object(object):
    """Class representing an object in a scene."""

    def __init__(self, data={}):
      """Initializes an empty object."""

      # Name of the object.
      self.id = data.get('id', 'unnamed')

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
      self.verts = dict(
        (int(k), (v[0], v[1], v[2]))
        for k, v in (data['verts'] or {}).iteritems()
      )

      # Map of edges.
      self.edges = dict(
        (int(k), (v[0], v[1]))
        for k, v in (data['edges'] or {}).iteritems()
      )

      # Map of UV points.
      self.uvPoints = dict(
        (int(k), (v[0], v[1]))
        for k, v in (data['uvPoints'] or {}).iteritems()
      )

      # Map of UV edges.
      self.uvEdges = dict(
        (int(k), (v[0], v[1]))
        for k, v in (data['uvEdges'] or {}).iteritems()
      )

      # Map of faces.
      self.faces = dict(
        (int(k), (v[0], v[1], v[2], v[3], v[4], v[5]))
        for k, v in (data['faces'] or {}).iteritems()

      )

      # Model matrix.
      q = Quaternion()
      q.x = self.rx
      q.y = self.ry
      q.z = self.rz
      q.w = self.rw
      trans = Matrix44.from_translation([self.tx, self.ty, self.tz])
      scale = Matrix44([
        [self.sx, 0, 0, 0],
        [0, self.sy, 0, 0],
        [0, 0, self.sz, 0],
        [0, 0, 0, 1]
      ])
      self.model = trans * q * scale


    @property
    def __dict__(self):
      """Converts the object to a serializable dictionary."""

      return  {
        'tx': self.tx, 'ty': self.ty, 'tz': self.tz,
        'sx': self.sx, 'sy': self.sy, 'sz': self.sz,
        'rx': self.rx, 'ry': self.ry, 'rz': self.rz, 'rw': self.rw
      }


  def __init__(self, name, data={}):
    """Initializes an empty scene."""

    self.objects = dict(
      (k, Scene.Object(v)) for k, v in (data['objects'] or {}).iteritems())


  @property
  def __dict__(self):
    """Converts the scene to a serializable dictionary."""

    return {
      'objects': dict((k, v.__dict__) for k, v in self.objects.iteritems())
    }

  def to_stl(self):
    """Converts the scene to STL format."""

    s = StringIO.StringIO()
    for id, obj in self.objects.iteritems():
      print >>s, 'solid %s' % obj.id

      for _, v in obj.faces.iteritems():
        e0 = obj.edges[abs(v[0])]
        e1 = obj.edges[abs(v[1])]
        e2 = obj.edges[abs(v[2])]
        v0 = obj.verts[e0[0] if v[0] >= 0 else e0[1]]
        v1 = obj.verts[e1[0] if v[1] >= 0 else e1[1]]
        v2 = obj.verts[e2[0] if v[2] >= 0 else e2[1]]

        v0 = obj.model * Vector4([v0[0], v0[1], v0[2], 1.0])
        v1 = obj.model * Vector4([v1[0], v1[1], v1[2], 1.0])
        v2 = obj.model * Vector4([v2[0], v2[1], v2[2], 1.0])
        a = v1 - v0
        b = v2 - v0
        n = Vector3([a.x, a.y, a.z]).cross(Vector3([b.x, b.y, b.z]))
        n.normalise()

        print >>s, 'facet normal %f %f %f' % (n.x, n.y, n.z)
        print >>s, 'outer loop'
        print >>s, 'vertex %f %f %f' % (v0.x, v0.y, v0.z)
        print >>s, 'vertex %f %f %f' % (v1.x, v1.y, v1.z)
        print >>s, 'vertex %f %f %f' % (v2.x, v2.y, v2.z)
        print >>s, 'end loop'

      print >>s, 'endsolid %s' % obj.id

    return s.getvalue()

  def to_obj(self):
    """Converts the scene to wavefront obj format."""


    s = StringIO.StringIO()
    for id, obj in self.objects.iteritems():
      print >>s, 'o "%s"' % id

      vmap = {}
      i = 1
      for k, v in obj.verts.iteritems():
        v = obj.model * Vector4([float(v[0]), float(v[1]), float(v[2]), 1.])
        vmap[k] = i
        i += 1
        print >>s, 'v %f %f %f' % (v.x, v.y, v.z)

      uvmap = {}
      i = 1
      for k, v in obj.uvPoints.iteritems():
        uvmap[k] = i
        i += 1
        print >>s, 'vt %f %f' % v

      for _, v in obj.faces.iteritems():
        e0 = obj.edges[abs(v[0])]
        e1 = obj.edges[abs(v[1])]
        e2 = obj.edges[abs(v[2])]
        v0 = vmap[e0[0] if v[0] >= 0 else e0[1]]
        v1 = vmap[e1[0] if v[1] >= 0 else e1[1]]
        v2 = vmap[e2[0] if v[2] >= 0 else e2[1]]

        ue0 = obj.uvEdges[abs(v[3])]
        ue1 = obj.uvEdges[abs(v[4])]
        ue2 = obj.uvEdges[abs(v[5])]
        uv0 = uvmap[ue0[0] if v[3] >= 0 else ue0[1]]
        uv1 = uvmap[ue1[0] if v[4] >= 0 else ue1[1]]
        uv2 = uvmap[ue2[0] if v[5] >= 0 else ue2[1]]

        print >>s, 'f %d/%d %d/%d %d/%d' % (v0, uv0, v1, uv1, v2, uv2)

    return s.getvalue()