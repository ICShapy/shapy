// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Object');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec2');
goog.require('goog.vec.Vec3');
goog.require('shapy.editor.Edge');
goog.require('shapy.editor.Editable');
goog.require('shapy.editor.Face');
goog.require('shapy.editor.Vertex');
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
 * @param {=Array<Object>}      opt_verts
 * @param {=Array<Object>}      opt_edges
 * @param {=Array<Object>}      opt_faces
 * @param {=Array<Object>}      opt_uvPoints
 * @param {=Array<Object>}      opt_uvEdges
 */
shapy.editor.Object = function(
    id,
    scene,
    opt_verts,
    opt_edges,
    opt_faces,
    opt_uvPoints,
    opt_uvEdges)
{
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
  this.dirty = true;

  /**
   * True if the object was deleted.
   */
  this.deleted = false;

  /**
   * Texture attached to the object.
   * @public {?string}
   */
  this.texture = null;

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
   * @public {goog.vec.Mat4} @const
   */
  this.model = goog.vec.Mat4.createFloat32Identity();

  /**
   * Cached inverse model matrix, used for raycasting.
   * @private {!goog.vec.Mat4.Type} @const
   */
  this.invModel_ = goog.vec.Mat4.createFloat32Identity();

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
   * @public {!Array<shapy.editor.Vertex>}
   * @const
   */
  this.verts = {};
  this.nextVert_ = 0;
  goog.object.forEach(opt_verts || {}, function(v, i) {
    this.nextVert_ = Math.max(this.nextVert_, i + 1);
    this.verts[i] = new shapy.editor.Vertex(this, i, v[0], v[1], v[2]);
  }, this);

  /**
   * Edge List.
   * @public {!Array<shapy.editor.Edge>}
   * @const
   */
  this.edges = {};
  this.nextEdge_ = 0;
  goog.object.forEach(opt_edges || {}, function(e, i) {
    this.nextEdge_ = Math.max(this.nextEdge_, i + 1);
    this.edges[i] = new shapy.editor.Edge(this, i, e[0], e[1], e[2], e[3]);
  }, this);

  /**
   * Face List
   * Expressed as triples of edge indices indexing this.edges
   * @public {!Array<Array<shapy.editor.Edge>>}
   * @const
   */
   this.faces = {};
   this.nextFace_ = 0;
   goog.object.forEach(opt_faces || {}, function(f, i) {
    this.nextFace_ = Math.max(this.nextFace_, i + 1);
    this.faces[i] = new shapy.editor.Face(
        this, i, f[0], f[1], f[2], f[3], f[4], f[5]);
   }, this);

   /**
    * UV points part of the UV projection.
    * @public {!Object<number, !shapy.editor.Object.UVPoint>}
    */
  this.uvPoints = {};
  this.nextUVPoint_ = 0;
  goog.object.forEach(opt_uvPoints || {}, function(up, i) {
    this.nextUVPoint_ = Math.max(this.nextUVPoint_, i + 1);
    this.uvPoints[i] = new shapy.editor.Object.UVPoint(this, i, up[0], up[1]);
  }, this);

  /**
   * UV edges part of the UV projection.
   * @public {!Object<number, !shapy.editor.Object.UVEdge>}
   */
  this.uvEdges = {};
  this.nextUVEdge_ = 0;
  goog.object.forEach(opt_uvEdges || {}, function(ue, i) {
    this.nextUVEdge_ = Math.max(this.nextUVEdge_, i + 1);
    this.uvEdges[i] = new shapy.editor.Object.UVEdge(this, i, ue[0], ue[1]);
  }, this);

  // Update the UV projection for missing faces.
  this.projectUV();
};
goog.inherits(shapy.editor.Object, shapy.editor.Editable);


/**
 * Edge distance treshold.
 * @type {number} @const
 */
shapy.editor.Object.EDGE_DIST_TRESHOLD = 0.01;


/**
 * UV distance treshold.
 * @type {number} @const
 */
shapy.editor.Object.UV_DIST_TRESHOLD = 0.01;


/**
 * Recomputes the model matrix.
 */
shapy.editor.Object.prototype.computeModel = function() {
  goog.vec.Mat4.makeIdentity(this.model);
  goog.vec.Mat4.translate(
      this.model,
      this.translate_[0], this.translate_[1], this.translate_[2]);
  goog.vec.Quaternion.toRotationMatrix4(
      this.rotQuat_, this.rotation_);
  goog.vec.Mat4.multMat(
      this.model, this.rotation_, this.model);
  goog.vec.Mat4.scale(
      this.model,
      this.scale_[0], this.scale_[1], this.scale_[2]);

  goog.vec.Mat4.invert(this.model, this.invModel_);
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
  this.dirty = true;
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
 * Sets object position.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.prototype.setPosition = function(x, y, z) {
  goog.vec.Vec3.setFromValues(this.translate_, x, y, z);
  this.dirty = true;
};


/**
 * Updates the object scale.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.prototype.scale = function(x, y, z) {
  var t = goog.vec.Vec3.createFromValues(x - 1, y - 1, z - 1);
  var m = goog.vec.Mat4.createFloat32();

  goog.vec.Mat4.invert(this.rotation_, m);
  goog.vec.Mat4.multVec3NoTranslate(m, t, t);

  this.scale_[0] *= (1 + t[0]);
  this.scale_[1] *= (1 + t[1]);
  this.scale_[2] *= (1 + t[2]);
  this.dirty = true;
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
 * @param {goog.vec.Quaternion} q
 */
shapy.editor.Object.prototype.rotate = function(q) {
  goog.vec.Quaternion.concat(q, this.rotQuat_, this.rotQuat_);
  this.dirty = true;
};


/**
 * Deletes the object.
 */
shapy.editor.Object.prototype.delete = function() {
  goog.object.remove(this.scene.objects, this.id);
  this.deleted = true;
};


/**
 * Returns the texture attached to an object.
 *
 * @return {shapy.browser.Texture}
 */
shapy.editor.Object.prototype.getTexture = function() {
  if (!this.texture) {
    return null;
  }
  if (!goog.object.containsKey(this.scene_.textures, this.texture)) {
    return null;
  }
  return this.scene_.textures[this.texture];
};


/**
 * Finds all parts that intersect a ray.
 *
 * @param {!goog.vec.Ray} ray
 * @param {!shapy.editor.Mode} mode Selection mode.
 *
 * @return {!Array<shapy.editor.Editable>}
 */
shapy.editor.Object.prototype.pickRay = function(ray, mode) {
  var q = goog.vec.Vec3.createFloat32();
  var v = goog.vec.Vec3.createFloat32();
  var obj = [];

  // Move the ray to model space.
  goog.vec.Mat4.multVec3(this.invModel_, ray.origin, q);
  goog.vec.Mat4.multVec3NoTranslate(this.invModel_, ray.dir, v);
  var r = new goog.vec.Ray(q, v);

  // Pick individual components.
  return [
      this.pickVertices_(r, mode),
      this.pickEdges_(r, mode),
      this.pickFaces_(r, mode),
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
  goog.vec.Mat4.transpose(this.model, transpose);
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
    goog.vec.Mat4.multVec3(vert.object.model, vert.position, p);

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
    var e0 = this.verts[edge.v0].position;
    goog.vec.Vec3.subtract(this.verts[edge.v1].position, e0, u);
    var c = shapy.editor.geom.getClosest(new goog.vec.Ray(e0, u), ray);

    if (goog.vec.Vec3.distance(c.p0, c.p1) >= 0.01 || c.s <= 0 || c.s >= 1) {
      return null;
    }

    // Convert the intersection point to world space.
    var p = goog.vec.Vec3.createFloat32();
    goog.vec.Mat4.multVec3(edge.object.model, c.p0, p);

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
 * @param {!shapy.editor.Mode} mode Selection mode.
 *
 * @return {!Array<shapy.editor.Editable>}
 */
shapy.editor.Object.prototype.pickFaces_ = function(ray, mode) {
  // Find all intersecting faces.
  var v = goog.object.filter(goog.object.map(this.faces, function(face) {
    var t = face.getVertexPositions_();
    var inter = shapy.editor.geom.intersectTriangle(ray, t[0], t[1], t[2]);
    var ed;

    if (!inter) {
      return null;
    }

    var i = inter.i;

    // Convert the intersection point to world space.
    var p = goog.vec.Vec3.createFloat32();
    goog.vec.Mat4.multVec3(this.model, i, p);

    // Determines if the point is close enough to the edge e.
    var edgeDist = goog.bind(function(e) {
      var edge = this.edges[e > 0 ? e : -e];
      var d = shapy.editor.geom.getDistance(
        p,
        this.verts[edge.v0].position,
        this.verts[edge.v1].position
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
    return (
      (!mode || !mode.paint) && (
        edgeDist(face.e0) ||
        edgeDist(face.e1) ||
        edgeDist(face.e2)
      ) ||
      {
        item: face,
        point: p
      }
    );
  }, this), goog.isDefAndNotNull, this);
  return goog.object.getValues(v);
};


/**
 * Finds vertices that match given UV coordinate.
 *
 * @param {!{x: number, y: number}} pt
 * @param {!shapy.editor.Mode} mode
 *
 * @return {Array}
 */
shapy.editor.Object.prototype.pickUVCoord = function(pt, mode) {
  var dist = shapy.editor.Object.UV_DIST_TRESHOLD;

  // Select faces.
  var faces = mode.face ? goog.object.filter(this.faces, function(face) {
    var uv = face.getUVs();

    var a0 = shapy.editor.geom.triangleArea(uv[0], uv[1], uv[2]);
    var a1 = shapy.editor.geom.triangleArea(pt, uv[1], uv[2]);
    var a2 = shapy.editor.geom.triangleArea(uv[0], pt, uv[2]);
    var a3 = shapy.editor.geom.triangleArea(uv[0], uv[1], pt);

    return Math.abs(a0 - a1 - a2 - a3) < 0.001;
  }, this) : {};

  // Select edges.
  var edges = mode.edge ? goog.object.filter(this.uvEdges, function(edge) {
    var uv = edge.getUVs();

    var du = uv[1].u - uv[0].u;
    var dv = uv[1].v - uv[0].v;

    var nu = uv[0].v - uv[1].v;
    var nv = uv[1].u - uv[0].u;
    var nl = Math.sqrt(nu * nu + nv * nv);
    nu /= nl;
    nv /= nl;

    var det = dv * nu - du * nv;
    var da = (pt.v - uv[0].v) * nu - (pt.u - uv[0].u) * nv;
    var db = (pt.u - uv[0].u) * dv - (pt.v - uv[0].v) * du;
    da /= det;
    db /= det;

    return Math.abs(db) < 0.01 && 0.0 <= da && da <= 1.0;
  }, this) : {};

  // Select vertices.
  var uvs = mode.vertex ? goog.object.filter(this.uvPoints, function(uv) {
    return shapy.editor.geom.dist2D(pt, uv.u, uv.v) < dist;
  }, this) : {};

  // Concatenate arrays.
  return goog.array.flatten(goog.array.map([faces, edges, uvs], function(x) {
    return goog.object.getValues(x);
  }));
};


/**
 * Finds parts that fall into the given UV region.
 *
 * @param {!{x0: number, x1: number, y0: number, y1: number}} group
 * @param {!shapy.editor.Mode} mode
 *
 * @return {Array}
 */
shapy.editor.Object.prototype.pickUVGroup = function(group, mode) {
  var parts = goog.array.flatten(goog.array.map([
    mode.face ? this.faces : {},
    mode.edge ? this.uvEdges : {},
    mode.vertex ? this.uvPoints : {}
  ], goog.object.getValues));

  return goog.array.filter(parts, function(part) {
    return goog.array.some(part.getUVs(), function(uv) {
      return (
        group.u0 <= uv.u && uv.u < group.u1 &&
        group.v0 <= uv.v && uv.v < group.v1
      );
    });
  });
};


/**
 * Merges a set of points into a single point.
 *
 * @param {!Array<shapy.editor.Vertex>} verts
 *
 * @return {!shapy.editor.Vertex}
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
  this.verts[vertID] = new shapy.editor.Vertex(
      this, vertID, center[0], center[1], center[2]);

  // Remove all edges & convert some to vertices.
  var faceIDs = [], edge = {}, map = {};
  this.edges = goog.object.filter(this.edges, function(e) {
    e.v0 = goog.array.contains(vertIDs, e.v0) ? vertID : e.v0;
    e.v1 = goog.array.contains(vertIDs, e.v1) ? vertID : e.v1;

    // If both endpoints were removed, dump the edge.
    if (e.v0 == e.v1) {
      return false;
    }

    // If an identical or an inverse edge was formed, get rid of edge
    if ((edge[e.v0] || {})[e.v1]) {
      map[e.id] = edge[e.v0][e.v1];
      return false;
    }
    if ((edge[e.v1] || {})[e.v0]) {
      map[e.id] = edge[e.v1][e.v0];
      return false;
    }

    map[e.id] = e.id;
    edge[e.v0] = edge[e.v0] || {};
    edge[e.v0][e.v1] = e.id;
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

  this.dirty = true;
  return this.verts[vertID];
};


/**
 * Projects UV coordinates over a cube.
 */
shapy.editor.Object.prototype.projectUV = function() {
  var n = goog.vec.Vec3.createFloat32();

  /**
   * Projects a single vertex to an imaginary sphere.
   */
  var projectVertex = goog.bind(function(vert) {
    // Find u & v.
    goog.vec.Vec3.normalize(vert.position, n);
    var u = 0.5 + Math.atan2(n[2], n[0]) / (2 * Math.PI);
    var v = 0.5 - Math.asin(n[1]) / Math.PI;

    // Add  a new UV point.
    this.dirty = true;
    var id = this.nextUVPoint_;
    this.nextUVPoint_++;
    this.uvPoints[id] = new shapy.editor.Object.UVPoint(this, id, u, v);
    return id;
  }, this);

  /**
   * Projects a new edge.
   */
  var projectEdge = goog.bind(function(uv0, uv1) {
    this.dirty = true;
    var id = this.nextUVEdge_;
    this.nextUVEdge_++;
    this.uvEdges[id] = new shapy.editor.Object.UVEdge(this, id, uv0, uv1);
    return id;
  }, this);

  // Update all edges that do not have UV coords set.
  goog.object.forEach(this.faces, function(face) {
    var verts = face.getVertices(), uv0, uv1, uv2;

    if (face.ue0 > 0) {
      uv0 = this.uvEdges[face.ue0].uv0;
      uv1 = this.uvEdges[face.ue0].uv1;
    } else if (face.ue0 < 0) {
      uv0 = this.uvEdges[-face.ue0].uv1;
      uv1 = this.uvEdges[-face.ue0].uv0;
    }

    if (face.ue1 > 0) {
      uv1 = this.uvEdges[face.ue1].uv0;
      uv2 = this.uvEdges[face.ue1].uv1;
    } else if (face.ue1 < 0) {
      uv1 = this.uvEdges[-face.ue1].uv1;
      uv2 = this.uvEdges[-face.ue1].uv0;
    }

    if (face.ue2 > 0) {
      uv2 = this.uvEdges[face.ue2].uv0;
      uv0 = this.uvEdges[face.ue2].uv1;
    } else if (face.ue2 < 0) {
      uv2 = this.uvEdges[-face.ue2].uv1;
      uv0 = this.uvEdges[-face.ue2].uv0;
    }

    uv0 = uv0 || projectVertex(verts[0]);
    uv1 = uv1 || projectVertex(verts[1]);
    uv2 = uv2 || projectVertex(verts[2]);

    face.ue0 = face.ue0 || projectEdge(uv0, uv1);
    face.ue1 = face.ue1 || projectEdge(uv1, uv2);
    face.ue2 = face.ue2 || projectEdge(uv2, uv0);
  }, this);
};


/**
 * Connects vertices and edges in order to create new edges or faces.
 *
 * @param {!Array<shapy.editor.Vertex>} verts Vertices to connect.
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
      if ((e.v0 == v[0] && e.v1 == v[1]) ||
          (e.v0 == v[1] && e.v1 == v[0]))
      {
        return id;
      }
    }

    var edgeID = this.nextEdge_++;
    this.edges[edgeID] = new shapy.editor.Edge(this, edgeID,
        v[0], v[1]);
    this.dirty = true;
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
    this.faces[faceID] = new shapy.editor.Face(this, faceID, e[0], e[1], e[2]);
    this.dirty = true;
  }
};


/**
 * Creates a face out of the given edge ids and adds it to the object.
 * Ensures that the created face has edges properly ordered.
 *
 * @param {number} id
 * @param {number} e0
 * @param {number} e1
 * @param {number} e2
 */
shapy.editor.Object.prototype.createFace = function(id, e0, e1, e2) {
  var is = [e0, e1, e2];
  var es = [this.edges[e0], this.edges[e1], this.edges[e2]];

  var swap = function(a, i, j) {
    var tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  };

  // The first edge is fixed, find the second edge.
  if (es[0].v1 == es[2].v0) {
    swap(is, 1, 2);
    swap(es, 1, 2);
  } else if (es[0].v1 == es[1].v1) {
    is[1] = -is[1];
  } else if (es[0].v1 == es[2].v1) {
    swap(is, 1, 2);
    swap(es, 1, 2);
    is[1] = -is[1];
  }

  // Swap the third edge if needed.
  if ((is[1] > 0 && es[1].v1 == es[2].v1) ||
      (is[1] < 0 && es[1].v0 == es[2].v1))
  {
    is[2] = -is[2];
  }

  // Create a new face.
  this.faces[id] = new shapy.editor.Face(this, id, is[0], is[1], is[2]);
};


/**
 * Cuts the object using the plane.
 *
 * @param {!goog.vec.Vec3.Type} n Normal of the plane.
 * @param {!goog.vec.Vec3.Type} p A point in the plane.
 */
shapy.editor.Object.prototype.cut = function(n, p) {
  var u = goog.vec.Vec3.createFloat32();

  var left = [];
  var right = [];

  var newEdges = [];

  // Helper used to retrieve faces formed using the given edge.
  var getEdgeFaces = goog.bind(function(edge) {
    return goog.object.filter(this.faces, function(face) {
      return (
        Math.abs(face.e0) == edge.id ||
        Math.abs(face.e1) == edge.id ||
        Math.abs(face.e2) == edge.id
      );
    }, this);
  }, this);

  // Find edges whose endpoints are on different sides of the plane.
  goog.object.forEach(this.edges, function(e) {
    var verts = e.getVertices();

    var d1 = goog.vec.Vec3.dot(n, verts[0].position);
    var d2 = goog.vec.Vec3.dot(n, verts[1].position);

    // Determine where the edge is relative to the cut plane.
    if (d1 < 0 && d2 < 0) {
      // Left side.
      goog.array.insert(left, e);
    } else if (d1 > 0 && d2 > 0) {
      // Right side.
      goog.array.insert(right, e);
    } else if (d1 == 0 && d2 == 0) {
      // In the cut plane.
      goog.array.insert(left, e);
      goog.array.insert(right, e);
    } else {
      // Plane intersects the edge.
      goog.vec.Vec3.subtract(verts[1].position, verts[0].position, u);
      var i = shapy.editor.geom.intersectPlane(
          new goog.vec.Ray(verts[0].position, u), n, p);

      // Create a new vertex.
      var vertId = this.nextVert_++;
      var newVertex = new shapy.editor.Vertex(this, vertId, i[0], i[1], i[2]);

      // Add the vertex to the object.
      this.verts[vertId] = newVertex;

      // Split the edge in two.
      var e1 = new shapy.editor.Edge(this, this.nextEdge_, e.v0, vertId);
      this.nextEdge_++;
      var e2 = new shapy.editor.Edge(this, this.nextEdge_, vertId, e.v1);
      this.nextEdge_++;

      // Record new edges.
      goog.array.insert(newEdges, [e, newVertex, e1, e2]);
    }
  }, this);

  // Construct new faces.
  goog.array.forEach(newEdges, function(q) {
    // Insert new edges.
    this.edges[q[2].id] = q[2];
    this.edges[q[3].id] = q[3];

    // Split faces formed by this edge in two.
    goog.object.forEach(getEdgeFaces(q[0]), function(f) {
      var edgeVerts = q[0].getVertices();
      var faceEdges = f.getEdges();

      var faceVerts = f.getVertices();
      var third;

      // Find the third vertex.
      if (faceVerts[0] != edgeVerts[0] && faceVerts[0] != edgeVerts[1]) {
        third = faceVerts[0];
      } else if (faceVerts[1] != edgeVerts[0] && faceVerts[1] != edgeVerts[1]) {
        third = faceVerts[1];
      } else {
        third = faceVerts[2];
      }

      // Construct a new edge that splits the face in two.
      var e = new shapy.editor.Edge(this, this.nextEdge_, q[1].id, third.id);
      this.nextEdge_++;

      // Add the new edge to the object.
      this.edges[e.id] = e;

      // Construct new faces.
      var side;

      // Construct face formed by: q[2].v0 q[2].v1 third.
      for (var k = 0; k < 3; k++) {
        if ((faceEdges[k].v0 == third.id && faceEdges[k].v1 == q[2].v0) ||
            (faceEdges[k].v1 == third.id && faceEdges[k].v0 == q[2].v0))
        {
          side = faceEdges[k].id;
          break;
        }
      }

      // Make sure the edges are ordered.
      this.createFace(this.nextFace_, e.id, q[2].id, side);
      this.nextFace_++;

      // Construct face formed by: q[3].v0 q[3].v1 third.
      for (var k = 0; k < 3; k++) {
        if ((faceEdges[k].v0 == third.id && faceEdges[k].v1 == q[3].v1) ||
            (faceEdges[k].v1 == third.id && faceEdges[k].v0 == q[3].v1))
        {
          side = faceEdges[k].id;
          break;
        }
      }

      // Make sure the edges are ordered.
      this.createFace(this.nextFace_, e.id, q[3].id, side);
      this.nextFace_++;

      // Remove the old face from the object.
      goog.object.remove(this.faces, f.id);

    }, this);
  }, this);

  // Update object edges.
  goog.array.forEach(newEdges, function(q) {
    // Remove the split edge.
    goog.object.remove(this.edges, q[0].id);
  }, this);

  // Get mid point on the cut surface.
  var mid = shapy.editor.geom.getMid(goog.array.map(newEdges, function(q) {
    return q[1].position;
  }, this));

  // Create a new vertex.
  var midVertex = new shapy.editor.Vertex(
      this, this.nextVert_, mid[0], mid[1], mid[2]);
  this.nextVert_++;

  this.verts[midVertex.id] = midVertex;

  this.dirty = true;
};


/**
 * Extrude a group of faces
 *
 * @param {!Array<!shapy.editor.Face>} faces
 *
 * @return {!Object} An object containing the extruded faces and the normal
 */
shapy.editor.Object.prototype.extrude = function(faces) {
  // Calculate normal
  var normal = goog.vec.Vec3.createFloat32();
  goog.array.forEach(faces, function(f) {
    goog.vec.Vec3.add(normal, f.calculateNormal(), normal);
  }, this);

  // If the normal is zero, we cannot extrude
  if (goog.vec.Vec3.magnitudeSquared(normal) == 0) {
    return;
  }

  // Normalise the normal
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
    if (!goog.object.containsKey(edgeCounts, e.id)) {
      edgeCounts[e.id] = 0;
    }
    edgeCounts[e.id]++;
  });
  var sortedEdges = goog.array.bucket(edges, function(e) {
    if (edgeCounts[e.id] == 1) {
      return 'boundary';
    } else {
      return 'internal';
    }
  });

  if (sortedEdges.internal) {
    goog.array.removeDuplicates(sortedEdges.internal);
  }

  // Compute the vertices
  var verts = goog.array.flatten(goog.array.map(edges, function(e) {
    return e.getVertices();
  }, this));
  goog.array.removeDuplicates(verts);

  // Compute the boundary vertices
  var boundaryVerts =
    goog.array.flatten(goog.array.map(sortedEdges.boundary, function(e) {
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
    this.verts[vertID] = new shapy.editor.Vertex(this, vertID,
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
    this.edges[edgeID] = new shapy.editor.Edge(this, edgeID,
      vertMap[e.v0], vertMap[e.v1]);
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
    this.edges[edgeID] = new shapy.editor.Edge(this, edgeID,
      p[0].id, p[1].id);
    return this.edges[edgeID];
  }, this);

  // Create faces joining the extruded faces and original faces
  var findEdge = function(edgeList, a, b) {
    for (var i = 0; i < edgeList.length; i++) {
      if (edgeList[i].v0 == a && edgeList[i].v1 == b) {
        return edgeList[i];
      }
    }
    return null;
  };
  goog.array.forEach(sortedEdges.boundary, function(e, i) {
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
    var aA = findEdge(joinEdges, ab.v0, AB.v0);
    var bB = findEdge(joinEdges, ab.v1, AB.v1);

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
    this.edges[edgeID] = new shapy.editor.Edge(this, edgeID,
      AB.v1, ab.v0);
    var diagonal = this.edges[edgeID];

    // Fill out faces
    var emitFace = goog.bind(function(a, b, c) {
      var faceID = this.nextFace_++;
      this.faces[faceID] = new shapy.editor.Face(this, faceID, a, b, c);
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
  // v1 Faces
  //

  // Clone faces
  var faceMap = {};
  var clonedFaces = goog.array.map(faces, function(f) {
    var faceID = this.nextFace_++;
    faceMap[f.id] = faceID;
    this.faces[faceID] = new shapy.editor.Face(this, faceID,
        f.e0 >= 0 ? edgeMap[f.e0] : -edgeMap[-f.e0],
        f.e1 >= 0 ? edgeMap[f.e1] : -edgeMap[-f.e1],
        f.e2 >= 0 ? edgeMap[f.e2] : -edgeMap[-f.e2]);
    f.delete(); // Delete original face
    return this.faces[faceID];
  }, this);

  // Delete internal edges
  if (sortedEdges.internal) {
    goog.array.forEach(sortedEdges.internal, function(e) {
      e.delete();
    });
  }

  this.dirty = true;

  return {
    normal: normal,
    faces: clonedFaces
  };
};


/**
 * Converts the object to JSON.
 *
 * @return {Object} Serializable object.
 */
shapy.editor.Object.prototype.toJSON = function() {
  var trunc = function(f) {
    return Math.floor(f * 1000) / 1000;
  };

  return {
    id: this.id,

    tx: this.translate_[0],
    ty: this.translate_[1],
    tz: this.translate_[2],

    sx: this.scale_[0],
    sy: this.scale_[1],
    sz: this.scale_[2],

    rx: this.rotQuat_[0],
    ry: this.rotQuat_[1],
    rz: this.rotQuat_[2],
    rw: this.rotQuat_[3],

    verts: goog.object.map(this.verts, function(v) {
      return [trunc(v.position[0]), trunc(v.position[1]), trunc(v.position[2])];
    }, this),

    edges: goog.object.map(this.edges, function(e) {
      return [e.v0, e.v1];
    }, this),

    faces: goog.object.map(this.faces, function(f) {
      return [f.e0, f.e1, f.e2, f.ue0, f.ue1, f.ue2];
    }, this),

    uvPoints: goog.object.map(this.uvPoints, function(up) {
      return [trunc(up.u), trunc(up.v)];
    }, this),

    uvEdges: goog.object.map(this.uvEdges, function(ue) {
      return [ue.uv0, ue.uv1];
    }, this)
  };
};



/**
 * UV projection point.
 *
 * @constructor
 * @extends {shapy.editor.Editable}
 *
 * @param {!shapy.editor.Object} object
 * @param {number}               id
 * @param {number}               u
 * @param {number}               v
 */
shapy.editor.Object.UVPoint = function(object, id, u, v) {
  shapy.editor.Editable.call(this, shapy.editor.Editable.Type.UV_POINT);

  /** @public {!shapy.editor.Object} @const */
  this.object = object;
  /** @public {number} @const */
  this.id = id;
  /** @public {number} */
  this.u = u || 0.0;
  /** @public {number} */
  this.v = v || 0.0;
};
goog.inherits(shapy.editor.Object.UVPoint, shapy.editor.Editable);



/**
 * Retrieves this point.
 *
 * @return {!Array<!goog.editor.UVPoint>}
 */
shapy.editor.Object.UVPoint.prototype.getUVs = function() {
  return [this];
};


/**
 * UV projection edge.
 *
 * @constructor
 * @extends {shapy.editor.Editable}
 *
 * @param {!shapy.editor.Object} object
 * @param {number}               id
 * @param {number}               uv0
 * @param {number}               uv1
 */
shapy.editor.Object.UVEdge = function(object, id, uv0, uv1) {
  shapy.editor.Editable.call(this, shapy.editor.Editable.Type.UV_EDGE);

  /** @public {!shapy.editor.Object} @const */
  this.object = object;
  /** @public {number} @const */
  this.id = id;
  /** @public {number} */
  this.uv0 = uv0;
  /** @public {number} */
  this.uv1 = uv1;
};
goog.inherits(shapy.editor.Object.UVEdge, shapy.editor.Editable);



/**
 * Retrieves the UV points at the end of the edge.
 *
 * @return {!Array<!goog.editor.UVPoint>}
 */
shapy.editor.Object.UVEdge.prototype.getUVs = function() {
  return [this.object.uvPoints[this.uv0], this.object.uvPoints[this.uv1]];
};
