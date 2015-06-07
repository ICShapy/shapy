// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Face');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec2');
goog.require('goog.vec.Vec3');
goog.require('shapy.editor.Editable');
goog.require('shapy.editor.geom');



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
shapy.editor.Face = function(object, id, e0, e1, e2) {
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
goog.inherits(shapy.editor.Face, shapy.editor.Editable);


/**
 * Retrieves the edges forming a face.
 *
 * @return {!Array<!shapy.editor.Edge>}
 */
shapy.editor.Face.prototype.getEdges = function() {
  return [
    this.object.edges[this.e0 >= 0 ? this.e0 : -this.e0],
    this.object.edges[this.e1 >= 0 ? this.e1 : -this.e1],
    this.object.edges[this.e2 >= 0 ? this.e2 : -this.e2]
  ];
};


/**
 * Retrives the vertices forming a face.
 *
 * @return {!Array<!shapy.editor.Vertex>}
 */
shapy.editor.Face.prototype.getVertices = function() {
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
shapy.editor.Face.prototype.getObject = function() {
  return this.object;
};


/**
 * Retrives the positions of vertices forming a face.
 *
 * @private
 *
 * @return {!Array<shapy.editor.Edge>}
 */
shapy.editor.Face.prototype.getVertexPositions_ = function() {
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
shapy.editor.Face.prototype.calculateNormal = function() {
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
shapy.editor.Face.prototype.getPosition = function() {
  var t = this.getVertexPositions_();
  var c = shapy.editor.geom.getCentroid(t[0], t[1], t[2]);
  goog.vec.Mat4.multVec3(this.object.model_, c, c);
  return c;
};


/**
 * Deletes the face.
 */
shapy.editor.Face.prototype.delete = function() {
  goog.object.remove(this.object.faces, this.id);
  this.object.dirtyMesh = true;
};


/**
 * Picks UV of the face.
 *
 * @param {!goog.vec.Ray}       ray
 * @param {shapy.editor.Camera} camera
 *
 * @return {!{u: number, v: number}}
 */
shapy.editor.Face.prototype.pickUV = function(ray, camera) {
  if (!this.uv0 || !this.uv1 || !this.uv2) {
    return {u: 0, v: 0};
  }

  var verts = this.getVertices();
  var uv0 = this.object.uvs[this.uv0];
  var uv1 = this.object.uvs[this.uv1];
  var uv2 = this.object.uvs[this.uv2];

  // Get vertex position.
  var p0 = goog.vec.Vec3.cloneFloat32(verts[0].position);
  var p1 = goog.vec.Vec3.cloneFloat32(verts[1].position);
  var p2 = goog.vec.Vec3.cloneFloat32(verts[2].position);

  // Transform points into worlds space.
  goog.vec.Mat4.multVec3(this.object.model_, p0, p0);
  goog.vec.Mat4.multVec3(this.object.model_, p1, p1);
  goog.vec.Mat4.multVec3(this.object.model_, p2, p2);

  // Get bary coords.
  var bary = shapy.editor.geom.intersectTriangleBary(ray, p0, p1, p2);

  if (!bary) {
    return;
  }

  // Project the points.
  var p04 = goog.vec.Vec4.createFloat32FromValues(p0[0], p0[1], p0[2], 1.0);
  var p14 = goog.vec.Vec4.createFloat32FromValues(p1[0], p1[1], p1[2], 1.0);
  var p24 = goog.vec.Vec4.createFloat32FromValues(p2[0], p2[1], p2[2], 1.0);

  goog.vec.Mat4.multVec4(camera.vp, p04, p04);
  goog.vec.Mat4.multVec4(camera.vp, p14, p14);
  goog.vec.Mat4.multVec4(camera.vp, p24, p24);

  // Interpolate.
  var d = bary.a / p04[3] + bary.b / p14[3] + bary.c / p24[3];

  var u = (bary.a * uv0.u) / p04[3] +
          (bary.b * uv1.u) / p14[3] +
          (bary.c * uv2.u) / p24[3];
  u = u / d;

  var v = (bary.a * uv0.v) / p04[3] +
          (bary.b * uv1.v) / p14[3] +
          (bary.c * uv2.v) / p24[3];
  v = v / d;

  return {u: u, v: v};
};
