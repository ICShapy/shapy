// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Editable');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec2');
goog.require('goog.vec.Vec3');



/**
 * Editable provides a way to manipulat properties of vertices, edges and faces.
 *
 * - scale
 * - rotate
 * - translate
 *
 * This is just an interface - objects must implement individual methods.
 *
 * @constructor
 */
shapy.editor.Editable = function() {
};


/**
 * Scales the editable.
 */
shapy.editor.Editable.prototype.scale = function() { };


/**
 * Rotates the editable.
 */
shapy.editor.Editable.prototype.rotate = function() { };


/**
 * Translate the editable.
 */
shapy.editor.Editable.prototype.translate = function() { };



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
 * @param {!Array<Object>} vertices
 * @param {!Array<Object>} edges
 * @param {!Array<Object>} faces
 */
shapy.editor.Object = function(id, vertices, edges, faces) {
  goog.base(this, shapy.editor.Editable);

  /** @public {string} */
  this.id = id;

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
  this.vertices = goog.array.map(vertices, function(vert) {
    return new shapy.editor.Object.Vertex(this, vert[0], vert[1], vert[2]);
  }, this);

  /**
   * Edge List.
   * @public {!Array<shapy.editor.Object.Edge>}
   * @const
   */
  this.edges = goog.array.map(edges, function(edge) {
    return new shapy.editor.Object.Edge(this, edge[0], edge[1]);
  }, this);

  /**
   * Face List
   * Expressed as triples of edge indices indexing this.edges
   * @private {}
   */
   this.faces_ = faces;
};
goog.inherits(shapy.editor.Object, shapy.editor.Editable);


/**
 * Vertex of an object.
 *
 * @constructor
 *
 * @param {!shapy.editor.Object} object
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.Vertex = function(object, x, y, z) {
  /** @private {!shapy.editor.Object} @const */
  this.object_ = object;

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
goog.inherits(shapy.editor.Object, shapy.editor.Editable);


/**
 * Retrieves the vertex position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.Vertex.prototype.getPosition = function() {
  var position = goog.vec.Vec3.createFloat32();
  goog.vec.Mat4.multVec3(this.object_.model_, this.position, position);
  return position;
};


/**
 * Translate the editable.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.Vertex.prototype.translate = function(x, y, z) {
  goog.vec.Vec3.setFromValues(this.position, x, y, z);
  goog.vec.Mat4.multVec3(this.object_.invModel_, this.position, this.position);
  this.object_.dirtyMesh = true;
};


/**
 * Edge of an object.
 *
 * @constructor
 *
 * @param {!shapy.editor.Obejct} object
 * @param {number}               start
 * @param {number}               end
 */
shapy.editor.Object.Edge = function(object, start, end) {
  /** @private {!shapy.editor.Object} @const */
  this.object_ = object;
  /** @public {number} @const */
  this.start = start;
  /** @public {number} @const */
  this.end = end;
};
goog.inherits(shapy.editor.Object, shapy.editor.Editable);


/**
 * Retrieves the vertex position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Object.Edge.prototype.getPosition = function() {
  var a = this.object_.vertices[this.start];
  var b = this.object_.vertices[this.end];
  var t = goog.vec.Vec3.createFloat32();

  goog.vec.Vec3.add(a, b, t);
  goog.vec.Vec3.scale(t, 0.5, t);
  goog.vec.Vec3.multVec3(this.model_, t, t);

  return t;
};


/**
 * Translate the editable.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.Object.Edge.prototype.translate = function(x, y, z) {
};



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
 * Retrieves the geometry data.
 *
 * @return {!Object}
 */
shapy.editor.Object.prototype.getGeometryData = function() {
  return {
    vertices: this.vertices,
    edges: this.edges,
    faces: this.faces_
  };
};


/**
 * Retrieves the object data.
 */
shapy.editor.Object.prototype.getData = function() {
  return {
    id: this.id,
    dirtyMesh: this.dirtyMesh,

    sx: this.scale_[0],
    sy: this.scale_[1],
    sz: this.scale_[2],

    rx: this.rotate_[0],
    ry: this.rotate_[1],
    rz: this.rotate_[2],

    tx: this.translate_[0],
    ty: this.translate_[1],
    tz: this.translate_[2],

    dirtyData: this.dirtyData_,
    versionNumber: this.versionNumber_,

    colour: this.colour_
  };
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
shapy.editor.Object.prototype.pick = function(ray) {
  var o = goog.vec.Vec3.createFloat32();
  var d = goog.vec.Vec3.createFloat32();
  var t = goog.vec.Vec3.createFloat32();

  // Move the ray to model space.
  goog.vec.Mat4.multVec3(this.invModel_, ray.origin, o);
  goog.vec.Mat4.multVec3NoTranslate(this.invModel_, ray.dir, d);

  // Find all intersecting vertices.
  var v = goog.array.filter(this.vertices, function(vert) {
    goog.vec.Vec3.subtract(vert.position, o, t);
    goog.vec.Vec3.cross(d, t, t);
    return goog.vec.Vec3.magnitude(t) < 0.2;
  });

  // Find all intersecting edges.
  var e = goog.array.filter(this.edges, function(edge) {

  });

  return [v, e];
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
  // A polygon is a circle divided into 'n' vertices
  var vertices = [];
  var edges = [];
  var face = [];
  for (var i = 0; i < n; i++) {
    // Let the polygon lie on the XY plane
    // TODO: Put it on the XZ plane instead?
    var angle = (2 * Math.PI / n) * i;
    vertices.push(radius * Math.sin(angle));
    vertices.push(radius * Math.cos(angle));
    vertices.push(0);
    edges.push([i, (i + 1) % n]);
    face.push(i);
  }

  return new shapy.editor.Object(vertices, edges, [face]);
};


/**
 * Build an cube object.
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
    [0, 4], [1, 5], [3, 7], [2, 6]  // Middle
  ];

  // Faces
  var faces = [
    [0, 1, 2, 3],   // +Z
    [1, 9, 5, 10],  // +X
    [4, 7, 6, 5],   // -Z
    [8, 3, 11, 7],  // -X
    [4, 9, 0, 8],   // +Y
    [2, 10, 6, 11]  // -Y
  ];

  return new shapy.editor.Object(id, vertices, edges, faces);
};
