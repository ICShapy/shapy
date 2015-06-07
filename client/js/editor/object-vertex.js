// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Vertex');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec3');
goog.require('shapy.editor.Editable');



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
shapy.editor.Vertex = function(object, id, x, y, z) {
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
};
goog.inherits(shapy.editor.Vertex, shapy.editor.Editable);


/**
 * Retrieves the vertex position.
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.Vertex.prototype.getPosition = function() {
  var position = goog.vec.Vec3.createFloat32();
  goog.vec.Mat4.multVec3(this.object.model_, this.position, position);
  return position;
};


/**
 * Retrieves the object edited.
 *
 * @return {shapy.editor.Object}
 */
shapy.editor.Vertex.prototype.getObject = function() {
  return this.object;
};


/**
 * Translate the Vertex.
 *
 * @param {number} dx
 * @param {number} dy
 * @param {number} dz
 */
shapy.editor.Vertex.prototype.translate = function(dx, dy, dz) {
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
 * @return {!Array<shapy.editor.Vertex>}
 */
shapy.editor.Vertex.prototype.getVertices = function() {
  return [this];
};


/**
 * Deletes the edge and all faces that use it.
 */
shapy.editor.Vertex.prototype.delete = function() {
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
