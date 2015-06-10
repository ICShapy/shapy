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
 * @param {number}               start
 * @param {number}               end
 */
shapy.editor.Edge = function(object, id, start, end) {
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
goog.inherits(shapy.editor.Edge, shapy.editor.Editable);


/**
 * Retrieves the edge position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Edge.prototype.getPosition = function() {
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
shapy.editor.Edge.prototype.getObject = function() {
  return this.object;
};


/**
 * Retrives the vertices forming an edge.
 */
shapy.editor.Edge.prototype.getVertices = function() {
  return [
    this.object.verts[this.start],
    this.object.verts[this.end]
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
