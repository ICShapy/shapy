// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Object');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec2');
goog.require('goog.vec.Vec3');
goog.require('shapy.editor.Editable');
goog.require('shapy.editor.geom');



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
 * @extends {shapy.editor.Editable}
 *
 * @param {string}              id
 * @param {!shapy.editor.Scene} scene
 * @param {!Array<Object>}      verts
 * @param {!Array<Object>}      edges
 * @param {!Array<Object>}      faces
 */
shapy.editor.Object = function(id, scene, verts, edges, faces) {
  shapy.editor.Editable.call(this, shapy.editor.Editable.Type.OBJECT);

  /** @public {string} */
  this.id = id;
  /** @public {!shapy.editor.Object} */
  this.object = this;
  /** @public {!shapy.Scene} */
  this.scene = scene;

  /**
   * True if the mesh is dirty, needing to be rebuilt.
   * @public {boolean}
   */
  this.dirtyMesh = true;

  /**
   * True if the object was deleted.
   */
  this.deleted = false;

  /**
   * @private {goog.vec.Vec3}
   */
  this.position_ = goog.vec.Vec3.createFromValues(0, 0, 0);

  /** @private {goog.vec.Vec3} @const */
  this.scale_ = goog.vec.Vec3.createFromValues(1, 1, 1);
  /** @private {goog.vec.Vec3} @const */
  this.translate_ = goog.vec.Vec3.createFromValues(0, 0, 0);

  /** @private {goog.vec.Quaternion.Type} @const */
  this.rotQuat_ = goog.vec.Quaternion.createFloat32FromValues(0, 0, 0, 1);
  /** @private {goog.vec.Mat4.Type} @const */
  this.rotation_ = goog.vec.Mat4.createFloat32();

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
    this.nextVert_ = Math.max(this.nextVert_, i + 2);
    this.verts[i + 1] = new shapy.editor.Object.Vertex(
        this, i + 1, v[0], v[1], v[2]);
  }, this);

  /**
   * Edge List.
   * @public {!Array<shapy.editor.Object.Edge>}
   * @const
   */
  this.edges = {};
  this.nextEdge_ = 0;
  goog.array.forEach(edges, function(e, i) {
    this.nextEdge_ = Math.max(this.nextEdge_, i + 2);
    this.edges[i + 1] = new shapy.editor.Object.Edge(
        this, i + 1, e[0], e[1]);
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
    this.nextFace_ = Math.max(this.nextFace_, i + 2);
    this.faces[i + 1] = new shapy.editor.Object.Face(
        this, i + 1, f[0], f[1], f[2]);
   }, this);

   /**
    * True if the object has a UV map.
    * @public {boolean}
    */
  this.uvs = {};
  this.nextUV_ = 1;
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
  goog.vec.Quaternion.toRotationMatrix4(
      this.rotQuat_, this.rotation_);
  goog.vec.Mat4.multMat(
      this.model_, this.rotation_, this.model_);
  goog.vec.Mat4.scale(
      this.model_,
      this.scale_[0], this.scale_[1], this.scale_[2]);

  goog.vec.Mat4.invert(this.model_, this.invModel_);
};


/**
 * Translates the object.
 *
 * @param {number} dx
 * @param {number} dy
 * @param {number} dz
 */
shapy.editor.Object.prototype.translate = function(dx, dy, dz) {
  this.translate_[0] += dx;
  this.translate_[1] += dy;
  this.translate_[2] += dz;
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
  this.scale_[0] *= x;
  this.scale_[1] *= y;
  this.scale_[2] *= z;
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
shapy.editor.Object.prototype.rotate = function(q) {
  goog.vec.Quaternion.concat(q, this.rotQuat_, this.rotQuat_);
};


/**
 * Deletes the object.
 */
shapy.editor.Object.prototype.delete = function() {
  goog.object.remove(this.scene.objects, this.id);
  this.deleted = true;
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
  var obj = [];

  // Move the ray to model space.
  goog.vec.Mat4.multVec3(this.invModel_, ray.origin, q);
  goog.vec.Mat4.multVec3NoTranslate(this.invModel_, ray.dir, v);
  var r = new goog.vec.Ray(q, v);

  // Pick individual components.
  return [
      this.pickVertices_(r),
      this.pickEdges_(r),
      this.pickFaces_(r),
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
  var transpose = goog.vec.Mat4.createFloat32();
  goog.vec.Mat4.transpose(this.model_, transpose);
  // Transform the clipping planes into model space.
  var planes = goog.array.map(frustum, function(plane) {
    var n = goog.vec.Vec3.cloneFloat32(plane.n);
    var o = goog.vec.Vec3.cloneFloat32(plane.o);
    goog.vec.Mat4.multVec3(this.invModel_, o, o);
    goog.vec.Mat4.multVec3NoTranslate(transpose, n, n);
    goog.vec.Vec3.normalize(n, n);
    return {
      n: n,
      d: -goog.vec.Vec3.dot(o, n)
    };
  }, this);

  // Retrieve all parts of the object.
  var all = goog.array.flatten(goog.array.map([
      this.verts,
      this.edges,
      this.faces
  ], goog.object.getValues));

  // Filter out all the parts which are inside all planes.
  var hits = goog.object.getValues(goog.object.filter(all, function(elem) {
    return goog.array.some(elem.getVertices(), function(v) {
      return goog.array.every(planes, function(plane) {
        return goog.vec.Vec3.dot(v.position, plane.n) + plane.d >= 0;
      });
    });
  }, this));

  // Include current object if any part is hit.
  return goog.array.isEmpty(hits) ? [] : goog.array.concat(hits, this);
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
      var edge = this.edges[e > 0 ? e : -e];
      var d = shapy.editor.geom.getDistance(
        p,
        this.verts[edge.start].position,
        this.verts[edge.end].position
      );

      if (d < shapy.editor.Object.EDGE_DIST_TRESHOLD) {
        return {
          item: edge,
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
 *
 * @return {!shapy.editor.Object.Vertex}
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
    f.e0 = map[f.e0] || -map[-f.e0];
    f.e1 = map[f.e1] || -map[-f.e1];
    f.e2 = map[f.e2] || -map[-f.e2];
    var e0 = goog.array.contains(faceIDs, Math.abs(f.e0));
    var e1 = goog.array.contains(faceIDs, Math.abs(f.e1));
    var e2 = goog.array.contains(faceIDs, Math.abs(f.e2));

    return e0 && e1 && e2;
  }, this);

  this.dirtyMesh = true;
  return this.verts[vertID];
};


/**
 * Projects UV coordinates over a cube.
 */
shapy.editor.Object.prototype.projectUV = function() {
  var ray = new goog.vec.Ray([0, 0, 0], [0, 1, 0]);
  var planes = [
    [+1, 0, 0],
    [-1, 0, 0],
    [0, +1, 0],
    [0, -1, 0],
    [0, 0, +1],
    [0, 0, -1],
  ];

  var project = goog.bind(function(v) {
    var id = this.nextUV_;
    this.nextUV_++;
    ray.setDir(v.position);
    goog.array.some(planes, function(p) {
      var q = shapy.editor.geom.intersectPlane(ray, p, p);
      if (q[0] < -1 || 1 < q[0] ||
          q[1] < -1 || 1 < q[1] ||
          q[2] < -1 || 1 < q[2])
      {
        return false;
      }
      if (Math.abs(q[0] - p[0]) <= 0.01) {
        this.uvs[id] = new shapy.editor.Object.UV(id,
          (q[1] + 1) / 2, (q[2] + 1) / 2);
        return true;
      }
      if (Math.abs(q[1] - p[1]) <= 0.01) {
        this.uvs[id] = new shapy.editor.Object.UV(id,
          (q[0] + 1) / 2, (q[2] + 1) / 2);
        return true;
      }
      if (Math.abs(q[2] - p[2]) <= 0.01) {
        this.uvs[id] = new shapy.editor.Object.UV(id,
          (q[0] + 1) / 2, (q[1] + 1) / 2);
        return true;
      }
      return false;
    }, this);
    return id;
  }, this);

  goog.object.forEach(this.faces, function(f) {
    var verts = f.getVertices();
    f.uv0 = f.uv0 || project(verts[0]);
    f.uv1 = f.uv2 || project(verts[1]);
    f.uv2 = f.uv3 || project(verts[2]);
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
 * Extrude a group of faces
 *
 * @param {!Array<!shapy.editor.Object.Face>} faces
 *
 * @return {!Object} An object containing the extruded faces and the normal
 */
shapy.editor.Object.prototype.extrude = function(faces) {
  // Calculate normal
  var normal = goog.vec.Vec3.createFloat32();
  goog.array.forEach(faces, function(f) {
    goog.vec.Vec3.add(normal, f.calculateNormal(), normal);
  }, this);
  goog.vec.Vec3.normalize(normal, normal);

  // Get the list of edges used in all vertices
  var edges = goog.array.flatten(goog.array.map(faces, function(f) {
    return f.getEdges();
  }, this));

  // Figure out the boundary edges by performing two passes, first to record the
  // counts of each edge, then second to remove edges with count != 1 (as
  // internal edges are defined to be edges shared by 2 faces).
  var edgeCounts = {};
  goog.array.forEach(edges, function(e) {
    if (!Object.prototype.hasOwnProperty.call(edgeCounts, e.id)) {
      edgeCounts[e.id] = 0;
    }
    edgeCounts[e.id]++;
  });
  var boundaryEdges = goog.array.filter(edges, function(e) {
    return edgeCounts[e.id] == 1;
  });

  // Compute the vertices
  var verts = goog.array.flatten(goog.array.map(edges, function(e) {
    return e.getVertices();
  }, this));
  goog.array.removeDuplicates(verts);

  // Compute the boundary vertices
  var boundaryVerts =
    goog.array.flatten(goog.array.map(boundaryEdges, function(e) {
      return e.getVertices();
    }, this));
  goog.array.removeDuplicates(boundaryVerts);

  //
  // Extruded faces/edges
  //

  // Clone vertices
  var vertMap = {};
  goog.array.map(verts, function(v) {
    var vertID = this.nextVert_++;
    vertMap[v.id] = vertID;
    this.verts[vertID] = new shapy.editor.Object.Vertex(this, vertID,
      v.position[0],
      v.position[1],
      v.position[2]);
    return this.verts[vertID];
  }, this);

  // Clone edges
  var edgeMap = {};
  goog.array.map(edges, function(e) {
    var edgeID = this.nextEdge_++;
    edgeMap[e.id] = edgeID;
    this.edges[edgeID] = new shapy.editor.Object.Edge(this, edgeID,
      vertMap[e.start], vertMap[e.end]);
    return this.edges[edgeID];
  }, this);

  //
  // Side Faces
  //

  // Build vert pairs
  var vertPairs = goog.array.map(boundaryVerts, function(v) {
    return [v, this.verts[vertMap[v.id]]];
  }, this);

  // Join pairs of vertices with edges
  var joinEdges = goog.array.map(vertPairs, function(p) {
    var edgeID = this.nextEdge_++;
    this.edges[edgeID] = new shapy.editor.Object.Edge(this, edgeID,
      p[0].id, p[1].id);
    return this.edges[edgeID];
  }, this);

  // Create faces joining the extruded faces and original faces
  var findEdge = function(edgeList, a, b) {
    for (var i = 0; i < edgeList.length; i++) {
      if (edgeList[i].start == a && edgeList[i].end == b) {
        return edgeList[i];
      }
    }
    return null;
  };
  goog.array.forEach(boundaryEdges, function(e, i) {
    // If ab is not flipped, it looks like:
    //    B<---A <- extruded
    //    ^ \  ^
    //    |  \ |
    //    b<---a <- origin
    //    Diagonal: B->a
    //
    // If ab is flipped, it looks like:
    //    A--->B <- extruded
    //    ^  / ^
    //    | /  |
    //    a--->b <- origin
    //    Diagonal: B->a
    var ab = e;
    var AB = this.edges[edgeMap[e.id]];
    var aA = findEdge(joinEdges, ab.start, AB.start);
    var bB = findEdge(joinEdges, ab.end, AB.end);

    // Determine whether this edge was flipped
    var flipped;
    goog.array.forEach(faces, function(f) {
      if (f.e0 == ab.id || f.e1 == ab.id || f.e2 == ab.id) {
        flipped = false;
      }
      if (f.e0 == -ab.id || f.e1 == -ab.id || f.e2 == -ab.id) {
        flipped = true;
      }
    }, this);

    // Create diagonal edge
    var edgeID = this.nextEdge_++;
    this.edges[edgeID] = new shapy.editor.Object.Edge(this, edgeID,
      AB.end, ab.start);
    var diagonal = this.edges[edgeID];

    // Fill out faces
    var emitFace = goog.bind(function(a, b, c) {
      var faceID = this.nextFace_++;
      this.faces[faceID] = new shapy.editor.Object.Face(this, faceID, a, b, c);
    }, this);
    if (flipped) {
      emitFace(aA.id, AB.id, diagonal.id);
      emitFace(-bB.id, -ab.id, -diagonal.id);
    } else {
      emitFace(-AB.id, -aA.id, -diagonal.id);
      emitFace(ab.id, bB.id, diagonal.id);
    }
  }, this);

  //
  // End Faces
  //

  // Clone faces
  var faceMap = {};
  var clonedFaces = goog.array.map(faces, function(f) {
    var faceID = this.nextFace_++;
    faceMap[f.id] = faceID;
    this.faces[faceID] = new shapy.editor.Object.Face(this, faceID,
        f.e0 >= 0 ? edgeMap[f.e0] : -edgeMap[-f.e0],
        f.e1 >= 0 ? edgeMap[f.e1] : -edgeMap[-f.e1],
        f.e2 >= 0 ? edgeMap[f.e2] : -edgeMap[-f.e2]);
    f.delete(); // Delete original face
    return this.faces[faceID];
  }, this);

  this.dirtyMesh = true;

  return {
    normal: normal,
    faces: clonedFaces
  };
};


/**
 * Build an cube object from triangles.
 *
 * @param {string}      id
 * @param {shapy.Scene} scene
 * @param {number}      w
 * @param {number}      h
 * @param {number}      d
 *
 * @return {!shapy.editor.Object}
 */
shapy.editor.Object.createCube = function(id, scene, w, h, d) {
  // Vertex layout:
  //   5-----6
  //  /     /|
  // 1-----2 |
  // | 7   | 8
  // |     |/
  // 3-----4
  var vertices = [
    [-w, +h, +d], // 1
    [+w, +h, +d], // 2
    [-w, -h, +d], // 3
    [+w, -h, +d], // 4
    [-w, +h, -d], // 5
    [+w, +h, -d], // 6
    [-w, -h, -d], // 7
    [+w, -h, -d], // 8
  ];

  var edges = [
    [1, 2], //  1
    [2, 3], //  2
    [3, 1], //  3
    [2, 4], //  4
    [4, 3], //  5
    [6, 8], //  6
    [8, 7], //  7
    [7, 5], //  8
    [5, 8], //  9
    [6, 5], // 10
    [1, 5], // 11
    [2, 5], // 12
    [6, 2], // 13
    [1, 7], // 14
    [3, 7], // 15
    [4, 6], // 16
    [4, 8], // 17
    [3, 8], // 18
  ];

  // Faces
  var faces = [
    [+1, +2, +3], [+4, +5, -2],      // +Z
    [+10, +9, -6], [-9, -8, -7],     // -Z
    [-1, +11, -12], [+12, -10, +13], // +Y
    [+18, +7, -15], [-18, -5, +17],  // -Y
    [-16, -4, -13], [+16, +6, -17],  // +X
    [+14, +8, -11], [-3, +15, -14],  // -X
  ];

  return new shapy.editor.Object(id, scene, vertices, edges, faces);
};


/**
 * Builds an sphere object from triangles.
 *
 * @param {string}      id
 * @param {shapy.Scene} scene
 * @param {number}      r
 * @param {number}      slices
 * @param {number}      stacks
 *
 * @return {!shapy.editor.Object}
 */
shapy.editor.Object.createSphere = function(id, scene, r, slices, stacks) {
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
    var v00 = 1;
    var v01 = 2 + j;

    edges.push([1, 2 + j]);
    faces.push([
        -(1 + (j + 0) % slices),
        +(1 + (j + 1) % slices),
        -(1 + slices + j * 3),
    ]);
  }

  for (var i = 1; i < stacks - 1; ++i) {
    for (var j = 0; j < slices; ++j) {
      var v00 = 2 + (i - 1) * slices + (j + 0) % slices;
      var v01 = 2 + (i - 1) * slices + (j + 1) % slices;
      var v10 = 2 + (i - 0) * slices + (j + 0) % slices;
      var v11 = 2 + (i - 0) * slices + (j + 1) % slices;

      edges.push([v00, v01]);
      edges.push([v01, v11]);
      edges.push([v11, v00]);
      faces.push([
          slices + (i - 1) * 3 * slices + j * 3 + 1,
          slices + (i - 1) * 3 * slices + j * 3 + 2,
          slices + (i - 1) * 3 * slices + j * 3 + 3
      ]);
      if (i < stacks - 2) {
        faces.push([
            slices + (i - 1) * 3 * slices + j * 3 + 3,
            slices + (i - 0) * 3 * slices + j * 3 + 1,
            slices + (i - 1) * 3 * slices + (j - 1 + slices) % slices * 3 + 2,
        ]);
      } else {
        faces.push([
            slices + (i - 1) * 3 * slices + j * 3 + 3,
            slices + (stacks - 2) * 3 * slices + j % slices * 2 + 1,
            slices + (i - 1) * 3 * slices + (j - 1 + slices) % slices * 3 + 2,
        ]);
      }
    }
  }

  for (var j = 0; j < slices; ++j) {
    var v00 = 2 + (stacks - 1) * slices;
    var v01 = 2 + (stacks - 2) * slices + j;
    var v10 = 2 + (stacks - 2) * slices + (j + 1) % slices;

    edges.push([v01, v10]);
    edges.push([v00, v01]);
    faces.push([
      -(slices + (stacks - 2) * slices * 3 + (j + 0) % slices * 2 + 1),
      +(slices + (stacks - 2) * slices * 3 + (j + 1) % slices * 2 + 2),
      -(slices + (stacks - 2) * slices * 3 + (j + 0) % slices * 2 + 2),
    ]);
  }

  return new shapy.editor.Object(id, scene, verts, edges, faces);
};



/**
 * Vertex of an object.
 *
 * @constructor
 * @extends {shapy.editor.Editable}
 *
 * @param {!shapy.editor.Object} object
 * @param {number} id
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.Vertex = function(object, id, x, y, z) {
  shapy.editor.Editable.call(this, shapy.editor.Editable.Type.VERTEX);

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
 * @param {number} dx
 * @param {number} dy
 * @param {number} dz
 */
shapy.editor.Object.Vertex.prototype.translate = function(dx, dy, dz) {
  goog.vec.Vec3.setFromValues(
      this.position,
      this.position[0] + dx,
      this.position[1] + dy,
      this.position[2] + dz
  );
  goog.vec.Mat4.multVec3NoTranslate(
      this.object.invModel_, this.position, this.position);
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
      goog.object.containsKey(this.object.edges, Math.abs(face.e0)) &&
      goog.object.containsKey(this.object.edges, Math.abs(face.e1)) &&
      goog.object.containsKey(this.object.edges, Math.abs(face.e2)));
  }, this);
  this.object.dirtyMesh = true;
};



/**
 * Edge of an object.
 *
 * @constructor
 * @extends {shapy.editor.Editable}
 *
 * @param {!shapy.editor.Object} object
 * @param {number}               id
 * @param {number}               start
 * @param {number}               end
 */
shapy.editor.Object.Edge = function(object, id, start, end) {
  shapy.editor.Editable.call(this, shapy.editor.Editable.Type.EDGE);

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
 * @extends {shapy.editor.Editable}
 *
 * @param {!shapy.editor.Object} object
 * @param {number}               id
 * @param {number}               e0
 * @param {number}               e1
 * @param {number}               e2
 */
shapy.editor.Object.Face = function(object, id, e0, e1, e2) {
  shapy.editor.Editable.call(this, shapy.editor.Editable.Type.FACE);

  /** @public {!shapy.editor.Object} @const */
  this.object = object;
  /** @public {!number} @const */
  this.id = id;
  /** @public {number} @const */
  this.e0 = e0;
  /** @public {number} @const */
  this.e1 = e1;
  /** @public {number} @const */
  this.e2 = e2;
  /** @public {number} @const */
  this.uv0 = 0;
  /** @public {number} @const */
  this.uv1 = 0;
  /** @public {number} @const */
  this.uv2 = 0;
};
goog.inherits(shapy.editor.Object.Face, shapy.editor.Editable);


/**
 * Retrieves the edges forming a face.
 *
 * @return {!Array<!shapy.editor.Object.Edge>}
 */
shapy.editor.Object.Face.prototype.getEdges = function() {
  return [
    this.object.edges[this.e0 >= 0 ? this.e0 : -this.e0],
    this.object.edges[this.e1 >= 0 ? this.e1 : -this.e1],
    this.object.edges[this.e2 >= 0 ? this.e2 : -this.e2]
  ];
};


/**
 * Retrives the vertices forming a face.
 *
 * @return {!Array<!shapy.editor.Object.Vertex>}
 */
shapy.editor.Object.Face.prototype.getVertices = function() {
  var e = this.getEdges();
  return [
    this.object.verts[this.e0 >= 0 ? e[0].start : e[0].end],
    this.object.verts[this.e1 >= 0 ? e[1].start : e[1].end],
    this.object.verts[this.e2 >= 0 ? e[2].start : e[2].end],
  ];
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
 * Calculate the normal of the face
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.Face.prototype.calculateNormal = function() {
  var normal = goog.vec.Vec3.createFloat32();
  var ab = goog.vec.Vec3.createFloat32();
  var ac = goog.vec.Vec3.createFloat32();
  var verts = this.getVertexPositions_();
  goog.vec.Vec3.subtract(verts[1], verts[0], ab);
  goog.vec.Vec3.subtract(verts[2], verts[0], ac);
  goog.vec.Vec3.cross(ac, ab, normal);
  goog.vec.Vec3.normalize(normal, normal);
  return normal;
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
 * Deletes the face.
 */
shapy.editor.Object.Face.prototype.delete = function() {
  goog.object.remove(this.object.faces, this.id);
  this.object.dirtyMesh = true;
};


/**
 * UV coordinate.
 *
 * @constructor
 *
 * @param {!shapy.editor.Object.Face} face
 * @param {=number}                   opt_u
 * @param {=number}                   opt_v
 */
shapy.editor.Object.UV = function(face, opt_u, opt_v) {
  /** @public {!shapy.editor.Object.Face} */
  this.face = face;
  /** @public {number} */
  this.u = opt_u || 0.0;
  /** @public {number} */
  this.v = opt_v || 0.0;
};


/**
 *
 */
shapy.editor.Object.UV.prototype = function() {

};
