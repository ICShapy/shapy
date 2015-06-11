// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Edge');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec3');
goog.require('shapy.editor.Editable');



/**
 * Edge of an object.
 *
 * @constructor
 * @extends {shapy.editor.Editable}
 *
 * @param {!shapy.editor.Object} object
 * @param {number}               id
 * @param {number}               v0
 * @param {number}               v1
 * @param {=number}              opt_uv0
 * @param {=number}              opt_uv1
 */
shapy.editor.Edge = function(object, id, v0, v1, opt_uv0, opt_uv1) {
  shapy.editor.Editable.call(this, shapy.editor.Editable.Type.EDGE);

  /** @public {!shapy.editor.Object} @const */
  this.object = object;
  /** @public {!number} @const */
  this.id = id;

  /** @public {number} */
  this.v0 = v0;
  /** @public {number} */
  this.v1 = v1;

  /** @public {number} */
  this.opt_uv0 = opt_uv0 || 0;
  /** @public {number} */
  this.opt_uv1 = opt_uv1 || 0;
};
goog.inherits(shapy.editor.Edge, shapy.editor.Editable);


/**
 * Retrieves the edge position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Edge.prototype.getPosition = function() {
  var v0 = this.object.verts[this.v0].position;
  var v1 = this.object.verts[this.v1].position;
  var t = goog.vec.Vec3.createFloat32();

  goog.vec.Vec3.add(v0, v1, t);
  goog.vec.Vec3.scale(t, 0.5, t);
  goog.vec.Mat4.multVec3(this.object.model_, t, t);

  return t;
};


/**
 * Retrieves the object edited.
 *
 * @return {shapy.editor.Object}
 */
shapy.editor.Edge.prototype.getObject = function() {
  return this.object;
};


/**
 * Retrives the vertices forming an edge.
 *
 * @return {!Array<!goog.editor.Vertex>}
 */
shapy.editor.Edge.prototype.getVertices = function() {
  return [
    this.object.verts[this.v0],
    this.object.verts[this.v1]
  ];
};


/**
 * Deletes the edge and all faces that use it.
 */
shapy.editor.Edge.prototype.delete = function() {
  goog.object.remove(this.object.edges, this.id);

  this.object.faces = goog.object.filter(this.object.faces, function(face) {
    return (
      goog.object.containsKey(this.object.edges, Math.abs(face.e0)) &&
      goog.object.containsKey(this.object.edges, Math.abs(face.e1)) &&
      goog.object.containsKey(this.object.edges, Math.abs(face.e2)));
  }, this);

  this.object.dirty = true;
};
