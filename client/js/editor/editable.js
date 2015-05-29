// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Editable');

/**
 * Editable provides a way to manipulate properties of vertices, edges and
 * faces.
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
  /** @public {!boolean} */
  this.hover = false;
  /** @public {!boolean} */
  this.selected = false;
};


/**
 * Hovers over the editable.
 *
 * @param {boolean} hover
 */
shapy.editor.Editable.prototype.setHover = function(hover) {
  this.hover = hover;
  // TODO: do this properly.
  this.object.dirtyMesh = true;
};


/**
 * Selects the editable.
 *
 * @param {boolean} selected
 */
shapy.editor.Editable.prototype.setSelected = function(selected) {
  this.selected = selected;
  // TODO: do this properly.
  this.object.dirtyMesh = true;
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
 * Delete the editable from the mesh
 */
shapy.editor.Editable.prototype.delete = function() { };


/**
 * Retrives the vertices forming this editable.
 *
 * @return {!Array<!shapy.editor.Object.Vertex>}
 */
shapy.editor.Editable.prototype.getVertices = function() { return []; };



/**
 * Collection of editable objects
 *
 * @constructor
 */
shapy.editor.EditableGroup = function() {
  /** @private {!Array<shapy.editor.Editable>} List of editables to control */
  this.editables_ = [];
};
goog.inherits(shapy.editor.EditableGroup, shapy.editor.Editable);


/**
 * Add an editable
 *
 * @param {shapy.editor.Editable} editable Editable object to add
 */
shapy.editor.EditableGroup.prototype.add = function(editable) {
  this.editables_.push(editable);
};


/**
 * Selects the editable.
 *
 * @param {boolean} selected
 */
shapy.editor.EditableGroup.prototype.setSelected = function(selected) {
  goog.object.forEach(this.editables_, function(editable) {
    editable.setSelected(selected);
  }, this);
};


/**
 * Retrieves the group average position
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.EditableGroup.prototype.getPosition = function() {
  var position = goog.vec.Vec3.createFloat32();
  goog.object.forEach(this.editables_, function(editable) {
    goog.vec.Vec3.add(position, editable.getPosition(), position);
  }, this);
  goog.vec.Vec3.scale(position, 1 / this.editables_.length, position);
  return position;
};


/**
 * Translate the group
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.EditableGroup.prototype.translate = function(x, y, z) {
  var mid = this.getPosition();

  // Apply translation to each vertex
  goog.object.forEach(this.getVertices(), function(vertex) {
    var delta = goog.vec.Vec3.createFloat32FromValues(x, y, z);
    goog.vec.Vec3.subtract(delta, mid, delta);
    goog.vec.Vec3.add(delta, vertex.getPosition(), delta);
    vertex.translate(delta[0], delta[1], delta[2]);
  }, this);
};


/**
 * Delete the editable from the mesh
 */
shapy.editor.EditableGroup.prototype.delete = function() {
  goog.object.forEach(this.editables_, function(editable) {
    editable.delete();
  }, this);
  this.editables_ = null;
};


/**
 * Retrives the vertices forming this group.
 */
shapy.editor.EditableGroup.prototype.getVertices = function() {
  // Gather all the vertices
  var vertices = [];
  goog.object.forEach(this.editables_, function(editable) {
    vertices = vertices.concat(editable.getVertices());
  }, this);

  // Remove duplicates
  return vertices.filter(function(value, index, self) {
    return self.indexOf(value) === index;
  });
};
