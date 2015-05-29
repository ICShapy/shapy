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
  goog.object.forEach(this.editables_, function(editable) {
    editable.translate(x, y, z);
  }, this);
};
