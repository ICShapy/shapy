// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Object');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec2');
goog.require('goog.vec.Vec3');
goog.require('shapy.editor.geom');
goog.require('shapy.editor.Editable');

/**
 * Abstract object metadata.
 *
 * Properties:
 *  - rotate
 *  - translate
 *  - scale
 * These properties can be edited using markers placed over the object. They
 * apply to every single vertex in the object by defining the model
 * matrix of the object.
 *
 * @constructor
 *
 * @param {string} id
 * @param {!Array<Object>} verts
 * @param {!Array<Object>} edges
 * @param {!Array<Object>} faces
 */
shapy.editor.Object = function(id, verts, edges, faces) {
  shapy.editor.Editable.call(this);

  /** @public {string} */
  this.id = id;
  /** @public {!shapy.editor.Object} */
  this.object = this;

  /**
   * True if the mesh is dirty, needing to be rebuilt.
   * @public {boolean}
   */
  this.dirtyMesh = true;

  /**
   * @private {goog.vec.Vec3}
   */
  this.position_ = goog.vec.Vec3.createFromValues(0, 0, 0);

  /** @private {goog.vec.Vec3} @const */
  this.scale_ = goog.vec.Vec3.createFromValues(1, 1, 1);
  /** @private {goog.vec.Vec3} @const */
  this.rotate_ = goog.vec.Vec3.createFromValues(0, 0, 0);
  /** @private {goog.vec.Vec3} @const */
  this.translate_ = goog.vec.Vec3.createFromValues(0, 0, 0);

  /**
   * Cached model matrix, computed from scale, rotate and translate.
   * @private {goog.vec.Mat4} @const
   */
  this.model_ = goog.vec.Mat4.createFloat32();
  goog.vec.Mat4.makeIdentity(this.model_);

  /**
   * Cached inverse model matrix, used for raycasting.
   * @private {!goog.vec.Mat4.Type} @const
   */
  this.invModel_ = goog.vec.Mat4.createFloat32();

  /**
   * True if any data field is dirty.
   * @private {boolean}
   */
  this.dirtyData_ = true;

  /**
   * Version number.
   * @private {number}
   */
  this.versionNumber_ = 1;

  /**
   * Colour.
   * @private {number}
   */
  this.colour_ = 0xffffff;

  /**
   * Object Vertex List
   * @public {!Array<shapy.editor.Object.Vertex>}
   * @const
   */
  this.verts = {};
  this.nextVert_ = 0;
  goog.array.forEach(verts, function(v, i) {
    this.nextVert_ = Math.max(this.nextVert_, i);
    this.verts[i] = new shapy.editor.Object.Vertex(this, i, v[0], v[1], v[2]);
  }, this);

  /**
   * Edge List.
   * @public {!Array<shapy.editor.Object.Edge>}
   * @const
   */
  this.edges = {};
  this.nextEdge_ = 0;
  goog.array.forEach(edges, function(e, i) {
    this.nextEdge_ = Math.max(this.nextEdge_, i);
    this.edges[i] = new shapy.editor.Object.Edge(this, i, e[0], e[1]);
  }, this);

  /**
   * Face List
   * Expressed as triples of edge indices indexing this.edges
   * @public {!Array<Array<shapy.editor.Object.Edge>>}
   * @const
   */
   this.faces = {};
   this.nextFace_ = 0;
   goog.array.forEach(faces, function(f, i) {
    this.nextFace_ = Math.max(this.nextFace_, i);
    this.faces[i] = new shapy.editor.Object.Face(this, i, f[0], f[1], f[2]);
   }, this);
};
goog.inherits(shapy.editor.Object, shapy.editor.Editable);


/**
 * Edge distance treshold.
 * @type {number} @const
 */
shapy.editor.Object.EDGE_DIST_TRESHOLD = 0.01;


/**
 * Recomputes the model matrix.
 */
shapy.editor.Object.prototype.computeModel = function() {
  goog.vec.Mat4.makeIdentity(this.model_);
  goog.vec.Mat4.translate(
      this.model_,
      this.translate_[0], this.translate_[1], this.translate_[2]);
  goog.vec.Mat4.scale(
      this.model_,
      this.scale_[0], this.scale_[1], this.scale_[2]);
  goog.vec.Mat4.rotateX(
      this.model_,
      this.rotate_[0]);
  goog.vec.Mat4.rotateY(
      this.model_,
      this.rotate_[1]);
  goog.vec.Mat4.rotateZ(
      this.model_,
      this.rotate_[2]);
  goog.vec.Mat4.invert(this.model_, this.invModel_);
};


/**
 * Updates the object position.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.prototype.translate = function(x, y, z) {
  goog.vec.Vec3.setFromValues(this.translate_, x, y, z);
};


/**
 * Retrieves the object position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.prototype.getPosition = function() {
  return this.translate_;
};


/**
 * Updates the object scale.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.prototype.scale = function(x, y, z) {
  goog.vec.Vec3.setFromValues(this.scale_, x, y, z);
};


/**
 * Retrieves the object scale.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.prototype.getScale = function() {
  return this.scale_;
};


/**
 * Rotates the editable.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.prototype.rotate = function(x, y, z) {
  goog.vec.Vec3.setFromValues(this.rotate_, x, y, z);
};


/**
 * Retrieves the object rotation.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.prototype.getRotation = function() {
  return this.rotate_;
};


/**
 * Finds all parts that intersect a ray.
 *
 * @param {!goog.vec.Ray} ray
 *
 * @return {!Array<shapy.editor.Editable>}
 */
shapy.editor.Object.prototype.pickRay = function(ray) {
  var q = goog.vec.Vec3.createFloat32();
  var v = goog.vec.Vec3.createFloat32();

  // Move the ray to model space.
  goog.vec.Mat4.multVec3(this.invModel_, ray.origin, q);
  goog.vec.Mat4.multVec3NoTranslate(this.invModel_, ray.dir, v);
  var r = new goog.vec.Ray(q, v);

  return [
      this.pickVertices_(r),
      this.pickEdges_(r),
      this.pickFaces_(r)
  ];
};


/**
 * Finds all parts that are inside a frustum.
 *
 * @param {!Array<Object>} frustum
 *
 * @return {!Array<shapy.editor.Editable>}
 */
shapy.editor.Object.prototype.pickFrustum = function(frustum) {
  return goog.object.getValues(goog.object.filter(this.verts, function(v) {
    var inside = 0;
    goog.array.forEach(frustum, function(plane) {
      var d = goog.vec.Vec3.dot(v.position, plane.n) + plane.d;
      if (d >= 0) {
        inside++;
      }
    }, this);
    return inside == frustum.length;
  }, this));
};


/**
 * Finds all vertices that intersect a ray.
 *
 * @private
 *
 * @param {!goog.vec.Ray} ray Ray converted to model space.
 *
 * @return {!Array<shapy.editor.Editable>}
 */
shapy.editor.Object.prototype.pickVertices_ = function(ray) {
  var u = goog.vec.Vec3.createFloat32();

  // Find all intersecting vertices.
  var v = goog.object.filter(goog.object.map(this.verts, function(vert) {
    goog.vec.Vec3.subtract(vert.position, ray.origin, u);
    goog.vec.Vec3.cross(ray.dir, u, u);
    if (goog.vec.Vec3.magnitude(u) >= 0.01) {
      return null;
    }

    // Convert the intersection point to world space.
    var p = goog.vec.Vec3.createFloat32();
    goog.vec.Mat4.multVec3(vert.object.model_, vert.position, p);

    return {
      item: vert,
      point: p
    };
  }, this), goog.isDefAndNotNull);
  return goog.object.getValues(v);
};


/**
 * Finds all edges that intersect a ray.
 *
 * @private
 *
 * @param {!goog.vec.Ray} ray Ray converted to model space.
 *
 * @return {!Array<shapy.editor.Editable>}
 *
 * @private
 */
shapy.editor.Object.prototype.pickEdges_ = function(ray) {
  var u = goog.vec.Vec3.createFloat32();

  // Find all intersecting edges.
  var v = goog.object.filter(goog.object.map(this.edges, function(edge) {
    // Find the ray associated with the edge.
    var e0 = this.verts[edge.start].position;
    goog.vec.Vec3.subtract(this.verts[edge.end].position, e0, u);
    var c = shapy.editor.geom.getClosest(new goog.vec.Ray(e0, u), ray);

    if (goog.vec.Vec3.distance(c.p0, c.p1) >= 0.01 || c.s <= 0 || c.s >= 1) {
      return null;
    }

    // Convert the intersection point to world space.
    var p = goog.vec.Vec3.createFloat32();
    goog.vec.Mat4.multVec3(edge.object.model_, c.p0, p);

    return {
      item: edge,
      point: p
    };
  }, this), goog.isDefAndNotNull);
  return goog.object.getValues(v);
};


/**
 * Finds all faces that intersect a ray.
 *
 * @private
 *
 * @param {!goog.vec.Ray} ray Ray converted to model space.
 *
 * @return {!Array<shapy.editor.Editable>}
 */
shapy.editor.Object.prototype.pickFaces_ = function(ray) {
  // Find all intersecting faces.
  var v = goog.object.filter(goog.object.map(this.faces, function(face) {
    var t = face.getVertexPositions_();
    var i = shapy.editor.geom.intersectTriangle(ray, t[0], t[1], t[2]);
    var ed;

    if (!i) {
      return null;
    }

    // Convert the intersection point to world space.
    var p = goog.vec.Vec3.createFloat32();
    goog.vec.Mat4.multVec3(this.model_, i, p);

    // Determines if the point is close enough to the edge e.
    var edgeDist = goog.bind(function(e) {
      var d = shapy.editor.geom.getDistance(
        p,
        this.verts[this.edges[e].start].position,
        this.verts[this.edges[e].end].position
      );

      if (d < shapy.editor.Object.EDGE_DIST_TRESHOLD) {
        return {
          item: this.edges[e],
          point: p
        };
      }

      return null;
    }, this);

    // Determine if the intersection point is close to an edge.
    ed = edgeDist(face.e0);
    if (ed) {
      return ed;
    }

    ed = edgeDist(face.e1);
    if (ed) {
      return ed;
    }

    ed = edgeDist(face.e2);
    if (ed) {
      return ed;
    }

    return {
      item: face,
      point: p
    };
  }, this), goog.isDefAndNotNull, this);
  return goog.object.getValues(v);
};


/**
 * Merges a set of points into a single point.
 *
 * @param {!Array<shapy.editor.Object.Vertex>} verts
 */
shapy.editor.Object.prototype.mergeVertices = function(verts) {
  var center = goog.vec.Vec3.createFloat32FromValues(0, 0, 0);
  var vertID = this.nextVert_;
  this.nextVert_++;

  var vertIDs = goog.array.map(verts, function(vert) {
    goog.vec.Vec3.add(center, vert.position, center);
    return vert.id;
  });
  goog.vec.Vec3.scale(center, 1.0 / verts.length, center);

  // Remove all affected vertices & add the new vertex.
  this.verts = goog.object.filter(this.verts, function(v) {
    return !goog.array.contains(vertIDs, v.id);
  }, this);
  this.verts[vertID] = new shapy.editor.Object.Vertex(
      this, vertID, center[0], center[1], center[2]);

  // Remove all edges & convert some to vertices.
  var faceIDs = [], edge = {}, map = {};
  this.edges = goog.object.filter(this.edges, function(e) {
    e.start = goog.array.contains(vertIDs, e.start) ? vertID : e.start;
    e.end = goog.array.contains(vertIDs, e.end) ? vertID : e.end;

    // If both endpoints were removed, dump the edge.
    if (e.start == e.end) {
      return false;
    }

    // If an identical or an inverse edge was formed, get rid of edge
    if ((edge[e.start] || {})[e.end]) {
      map[e.id] = edge[e.start][e.end];
      return false;
    }
    if ((edge[e.end] || {})[e.start]) {
      map[e.id] = edge[e.end][e.start];
      return false;
    }

    map[e.id] = e.id;
    edge[e.start] = edge[e.start] || {};
    edge[e.start][e.end] = e.id;
    faceIDs.push(e.id);
    return true;
  }, this);

  // Remove faces that had any edges removed.
  this.faces = goog.object.filter(this.faces, function(f) {
    f.e0 = map[f.e0]; f.e1 = map[f.e1]; f.e2 = map[f.e2];
    var e0 = goog.array.contains(faceIDs, f.e0);
    var e1 = goog.array.contains(faceIDs, f.e1);
    var e2 = goog.array.contains(faceIDs, f.e2);

    return e0 && e1 && e2;
  }, this);

  this.dirtyMesh = true;
};


/**
 * Connects vertices and edges in order to create new edges or faces.
 *
 * @param {!Array<shapy.editor.Object.Vertex>} verts Vertices to connect.
 */
shapy.editor.Object.prototype.connect = function(verts) {
  var pairs;
  if (verts.length == 2) {
    pairs = [
      [verts[0].id, verts[1].id]
    ];
  } else {
    pairs = [
      [verts[0].id, verts[1].id],
      [verts[1].id, verts[2].id],
      [verts[2].id, verts[0].id]
    ];
  }

  var e = goog.array.map(pairs, function(v) {
    for (var id in this.edges) {
      var e = this.edges[id];
      if ((e.start == v[0] && e.end == v[1]) ||
          (e.start == v[1] && e.end == v[0]))
      {
        return id;
      }
    }

    var edgeID = this.nextEdge_++;
    this.edges[edgeID] = new shapy.editor.Object.Edge(this, edgeID,
        v[0], v[1]);
    this.dirtyMesh = true;
    return edgeID;
  }, this);

  if (verts.length == 3) {
    e.sort();
    var exists = goog.object.some(this.faces, function(f) {
      var v = [f.e0, f.e1, f.e2];
      v.sort();
      return v[0] == e[0] && v[1] == e[1] && v[2] == e[2];
    });
    if (exists) {
      return;
    }
    var faceID = this.nextFace_++;
    this.faces[faceID] = new shapy.editor.Object.Face(this, faceID,
        e[0], e[1], e[2]);
    this.dirtyMesh = true;
  }
};


/**
 * Build a polygon object
 *
 * @param {number} n Number of sides
 * @param {number} radius Radius of each vertex
 *
 * @return {!shapy.editor.Object}
 */
shapy.editor.Object.createPolygon = function(n, radius) {
  // A polygon is a circle divided into 'n'
  var verts = [];
  var edges = [];
  var face = [];
  for (var i = 0; i < n; i++) {
    // Let the polygon lie on the XY plane
    // TODO: Put it on the XZ plane instead?
    var angle = (2 * Math.PI / n) * i;
    verts.push(radius * Math.sin(angle));
    verts.push(radius * Math.cos(angle));
    verts.push(0);
    edges.push([i, (i + 1) % n]);
    face.push(i);
  }

  return new shapy.editor.Object(verts, edges, [face]);
};


/**
 * Build an cube object from triangles.
 *
 * @param {string} id
 * @param {number} w
 * @param {number} h
 * @param {number} d
 *
 * @return {!shapy.editor.Object}
 */
shapy.editor.Object.createCube = function(id, w, h, d) {
  // Vertex layout:
  //   4-----5
  //  /     /|
  // 0-----1 |
  // | 6   | 7
  // |     |/
  // 2-----3
  var vertices = [
    [-w, +h, +d], // 0
    [+w, +h, +d], // 1
    [-w, -h, +d], // 2
    [+w, -h, +d], // 3
    [-w, +h, -d], // 4
    [+w, +h, -d], // 5
    [-w, -h, -d], // 6
    [+w, -h, -d], // 7
  ];

  // Edge layout:
  //     +--4--+
  //   8/|7   9/5
  //   +--0--+ |
  //   3 +-6-1-+
  // 11|/    |/10
  //   +--2--+
  var edges = [
    [0, 1], [1, 3], [3, 2], [2, 0], // Front
    [4, 5], [5, 7], [7, 6], [6, 4], // Back
    [0, 4], [1, 5], [3, 7], [2, 6], // Middle
    [0, 3],                         // Diag 12
    [5, 3],                         // Diag 13
    [5, 6],                         // Diag 14
    [4, 2],                         // Diag 15
    [4, 1],                         // Diag 16
    [7, 2]                          // Diag 17
  ];

  // Faces
  var faces = [
    [0, 1, 12], [2, 3, 12],     // +Z
    [1, 9, 13], [5, 10, 13],    // +X
    [4, 7, 14], [6, 5, 14],     // -Z
    [8, 3, 15], [11, 7, 15],    // -X
    [4, 9, 16],  [0, 8, 16],    // +Y
    [2, 10, 17], [6, 11, 17]    // -Y
  ];

  return new shapy.editor.Object(id, vertices, edges, faces);
};


/**
 * Builds an sphere object from triangles.
 *
 * @param {string} id
 * @param {number} r
 * @param {number} slices
 * @param {number} stacks
 *
 * @return {!shapy.editor.Object}
 */
shapy.editor.Object.createSphere = function(id, r, slices, stacks) {
  var verts = [], edges = [], faces = [];

  // Create all verts.
  var dPhi = Math.PI / stacks, dTheta = 2 * Math.PI / slices;
  verts.push([0, r, 0]);
  for (var i = 1; i < stacks; ++i) {
    var phi = Math.PI / 2.0 - dPhi * i;
    for (var j = 0; j < slices; ++j) {
      var theta = dTheta * j;
      verts.push([
        r * Math.cos(phi) * Math.sin(theta),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.cos(theta)
      ]);
    }
  }
  verts.push([0, -r, 0]);

  for (var j = 0; j < slices; ++j) {
    var v00 = 0;
    var v01 = 1 + j;
    var v10 = 1 + (j + 1) % slices;

    edges.push([v00, v01]);
    faces.push([
        (j + 0) % slices,
        slices + j * 3 + 0,
        (j + 1) % slices
    ]);
  }

  for (var i = 1; i < stacks - 1; ++i) {
    for (var j = 0; j < slices; ++j) {
      var v00 = 1 + (i - 1) * slices + (j + 0) % slices;
      var v01 = 1 + (i - 1) * slices + (j + 1) % slices;
      var v10 = 1 + (i - 0) * slices + (j + 0) % slices;
      var v11 = 1 + (i - 0) * slices + (j + 1) % slices;

      edges.push([v00, v01]);
      edges.push([v01, v11]);
      edges.push([v11, v00]);
      faces.push([
          slices + (i - 1) * 3 * slices + j * 3 + 0,
          slices + (i - 1) * 3 * slices + j * 3 + 1,
          slices + (i - 1) * 3 * slices + j * 3 + 2
      ]);
      if (i < stacks - 2) {
        faces.push([
            slices + (i - 0) * 3 * slices + (j + 1) % slices * 3 + 0,
            slices + (i - 1) * 3 * slices + (j + 0) % slices * 3 + 1,
            slices + (i - 1) * 3 * slices + (j + 1) % slices * 3 + 2,
        ]);
      } else {
        faces.push([
            slices + (stacks - 2) * slices * 3 + (j + 1) % slices * 2 + 0,
            slices + (i - 1) * 3 * slices + (j + 0) % slices * 3 + 1,
            slices + (i - 1) * 3 * slices + (j + 1) % slices * 3 + 2,
        ]);
      }
    }
  }

  for (var j = 0; j < slices; ++j) {
    var v00 = 1 + (stacks - 1) * slices;
    var v01 = 1 + (stacks - 2) * slices + j;
    var v10 = 1 + (stacks - 2) * slices + (j + 1) % slices;

    edges.push([v01, v10]);
    edges.push([v00, v01]);
    faces.push([
      slices + (stacks - 2) * slices * 3 + (j + 0) % slices * 2 + 0,
      slices + (stacks - 2) * slices * 3 + (j + 0) % slices * 2 + 1,
      slices + (stacks - 2) * slices * 3 + (j + 1) % slices * 2 + 1,
    ]);
  }

  return new shapy.editor.Object(id, verts, edges, faces);
};



/**
 * Vertex of an object.
 *
 * @constructor
 *
 * @param {!shapy.editor.Object} object
 * @param {number} id
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.Vertex = function(object, id, x, y, z) {
  shapy.editor.Editable.call(this);

  /** @public {!shapy.editor.Object} @const */
  this.object = object;
  /** @public {!number} @const */
  this.id = id;

  /**
   * Position of the vertex.
   * @public {!goog.vec.Vec3.Type} @const
   */
  this.position = goog.vec.Vec3.createFloat32FromValues(x, y, z);

  /**
   * UV coordinate of the vertex.
   * @public {!goog.vec.Vec2.Type} @const
   */
  this.uv = goog.vec.Vec2.createFloat32();
};
goog.inherits(shapy.editor.Object.Vertex, shapy.editor.Editable);


/**
 * Retrieves the vertex position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.Vertex.prototype.getPosition = function() {
  var position = goog.vec.Vec3.createFloat32();
  goog.vec.Mat4.multVec3(this.object.model_, this.position, position);
  return position;
};


/**
 * Retrieves the object edited.
 *
 * @return {shapy.editor.Object}
 */
shapy.editor.Object.Vertex.prototype.getObject = function() {
  return this.object;
};


/**
 * Translate the Vertex.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.Vertex.prototype.translate = function(x, y, z) {
  goog.vec.Vec3.setFromValues(this.position, x, y, z);
  goog.vec.Mat4.multVec3(this.object.invModel_, this.position, this.position);
  this.object.dirtyMesh = true;
};


/**
 * Retrives the vertices forming this vertex (pretty trivial).
 *
 * @return {!Array<shapy.editor.Object.Vertex>}
 */
shapy.editor.Object.Vertex.prototype.getVertices = function() {
  return [this];
};


/**
 * Deletes the edge and all faces that use it.
 */
shapy.editor.Object.Vertex.prototype.delete = function() {
  goog.object.remove(this.object.verts, this.id);
  this.object.edges = goog.object.filter(this.object.edges, function(edge) {
    return (
      goog.object.containsKey(this.object.verts, edge.start) &&
      goog.object.containsKey(this.object.verts, edge.end)
    );
  }, this);
  this.object.faces = goog.object.filter(this.object.faces, function(face) {
    return (
      goog.object.containsKey(this.object.edges, face.e0) &&
      goog.object.containsKey(this.object.edges, face.e1) &&
      goog.object.containsKey(this.object.edges, face.e2));
  }, this);
  this.object.dirtyMesh = true;
};



/**
 * Edge of an object.
 *
 * @constructor
 *
 * @param {!shapy.editor.Object} object
 * @param {number}               id
 * @param {number}               start
 * @param {number}               end
 */
shapy.editor.Object.Edge = function(object, id, start, end) {
  shapy.editor.Editable.call(this);

  /** @public {!shapy.editor.Object} @const */
  this.object = object;
  /** @public {!number} @const */
  this.id = id;
  /** @public {number} @const */
  this.start = start;
  /** @public {number} @const */
  this.end = end;
};
goog.inherits(shapy.editor.Object.Edge, shapy.editor.Editable);


/**
 * Retrieves the edge position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.Edge.prototype.getPosition = function() {
  var a = this.object.verts[this.start].position;
  var b = this.object.verts[this.end].position;
  var t = goog.vec.Vec3.createFloat32();

  goog.vec.Vec3.add(a, b, t);
  goog.vec.Vec3.scale(t, 0.5, t);
  goog.vec.Mat4.multVec3(this.object.model_, t, t);

  return t;
};


/**
 * Retrieves the object edited.
 *
 * @return {shapy.editor.Object}
 */
shapy.editor.Object.Edge.prototype.getObject = function() {
  return this.object;
};


/**
 * Translate the edge.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.Edge.prototype.translate = function(x, y, z) {
  var a = this.object.verts[this.start].position;
  var b = this.object.verts[this.end].position;

  var t = goog.vec.Vec3.createFloat32();
  var s = goog.vec.Vec3.createFloat32();

  // Compute offset.
  goog.vec.Vec3.add(a, b, t);
  goog.vec.Vec3.scale(t, 0.5, t);
  goog.vec.Mat4.multVec3(this.object.invModel_, [x, y, z], s);

  // Adjust endpoints.
  goog.vec.Vec3.subtract(s, t, s);
  goog.vec.Vec3.add(a, s, a);
  goog.vec.Vec3.add(b, s, b);
  this.object.dirtyMesh = true;
};


/**
 * Retrives the vertices forming an edge.
 */
shapy.editor.Object.Edge.prototype.getVertices = function() {
  return [
    this.object.verts[this.start],
    this.object.verts[this.end]
  ];
};


/**
 * Deletes the edge and all faces that use it.
 */
shapy.editor.Object.Edge.prototype.delete = function() {
  goog.object.remove(this.object.edges, this.id);
  this.object.faces = goog.object.filter(this.object.faces, function(face) {
    return (
      goog.object.containsKey(this.object.edges, face.e0) &&
      goog.object.containsKey(this.object.edges, face.e1) &&
      goog.object.containsKey(this.object.edges, face.e2));
  }, this);
  this.object.dirtyMesh = true;
};



/**
 * Face of an object.
 *
 * @constructor
 *
 * @param {!shapy.editor.Object} object
 * @param {number}               id
 * @param {number}               e0
 * @param {number}               e1
 * @param {number}               e2
 */
shapy.editor.Object.Face = function(object, id, e0, e1, e2) {
  shapy.editor.Editable.call(this);
  /** @public {!shapy.editor.Object} @const */
  this.object = object;
  /** @public {!number} @const */
  this.id = id;
  /** @public {number}  @const */
  this.e0 = e0;
  /** @public {number}  @const */
  this.e1 = e1;
  /** @public {number}  @const */
  this.e2 = e2;
};
goog.inherits(shapy.editor.Object.Face, shapy.editor.Editable);


/**
 * Retrives the vertices forming a face.
 *
 * @return {!Array<!shapy.editor.Object.Vertex>}
 */
shapy.editor.Object.Face.prototype.getVertices = function() {
  var e0 = this.object.edges[this.e0];
  var e1 = this.object.edges[this.e1];
  var e2 = this.object.edges[this.e2];
  var verts = [
    e0.start, e0.end,
    e1.start, e1.end,
    e2.start, e2.end
  ];

  goog.array.removeDuplicates(verts);
  return goog.array.map(verts, function(v) {
    return this.object.verts[v];
  }, this);
};


/**
 * Retrieves the object edited.
 *
 * @return {shapy.editor.Object}
 */
shapy.editor.Object.Face.prototype.getObject = function() {
  return this.object;
};


/**
 * Retrives the positions of vertices forming a face.
 *
 * @private
 *
 * @return {!Array<shapy.editor.Object.Edge>}
 */
shapy.editor.Object.Face.prototype.getVertexPositions_ = function() {
  var verts = this.getVertices();
  return [
      verts[0].position,
      verts[1].position,
      verts[2].position
  ];
};


/**
 * Retrieves the face position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.Face.prototype.getPosition = function() {
  var t = this.getVertexPositions_();
  var c = shapy.editor.geom.getCentroid(t[0], t[1], t[2]);
  goog.vec.Mat4.multVec3(this.object.model_, c, c);
  return c;
};


/**
 * Translate the face.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.Face.prototype.translate = function(x, y, z) {
  var t = this.getVertexPositions_();
  var c = shapy.editor.geom.getCentroid(t[0], t[1], t[2]);

  // Get the translation vector.
  var d = goog.vec.Vec3.createFloat32FromValues(x, y, z);
  goog.vec.Mat4.multVec3(this.object.invModel_, d, d);
  goog.vec.Vec3.subtract(d, c, d);

  // Adjust the points.
  goog.vec.Vec3.add(t[0], d, t[0]);
  goog.vec.Vec3.add(t[1], d, t[1]);
  goog.vec.Vec3.add(t[2], d, t[2]);

  this.object.dirtyMesh = true;
};


/**
 * Deletes the face.
 */
shapy.editor.Object.Face.prototype.delete = function() {
  goog.object.remove(this.object.faces, this.id);
  this.object.dirtyMesh = true;
};
