// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Editable');
goog.provide('shapy.editor.Mode');



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
 *
 * @param {string} type Type of the editable.
 */
shapy.editor.Editable = function(type) {
  /**
   * @public {shapy.editor.Editable.Type}
   * @const
   */
  this.type = type;

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
 * Retrieves the object edited.
 *
 * @return {shapy.editor.Object}
 */
shapy.editor.Editable.prototype.getObject = function() { return null; };


/**
 * Collection of editable parts of an object.
 *
 * @param {=Array<shapy.editor.Editable>} opt_editables
 * @param {shapy.editor.Editable.Type}
 *
 * @constructor
 * @extends {shapy.editor.Editable}
 */
shapy.editor.EditableGroup = function(opt_editables, type) {
  shapy.editor.Editable.call(this, type);

  /** @private {!Array<shapy.editor.Editable>} List of editables to control */
  this.editables_ = opt_editables || [];
};
goog.inherits(shapy.editor.EditableGroup, shapy.editor.Editable);


/**
 * Add an editable
 *
 * @param {shapy.editor.Editable} editable Editable object to add.
 *
 * @return {boolean} True if group is not empty.
 */
shapy.editor.EditableGroup.prototype.add = function(editable) {
  if (goog.array.contains(this.editables_, editable)) {
    editable.setSelected(false);
    goog.array.remove(this.editables_, editable);
  } else {
    this.editables_.push(editable);
  }
  return this.editables_.length != 0;
};


/**
 * Hovers the editable.
 *
 * @param {boolean} hover
 */
shapy.editor.EditableGroup.prototype.setHover = function(hover) {
  goog.object.forEach(this.editables_, function(editable) {
    editable.setHover(hover);
  }, this);
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
  var position = goog.vec.Vec3.createFloat32FromValues(0, 0, 0);
  if (this.editables_.length <= 0) {
    return position;
  }

  goog.object.forEach(this.editables_, function(editable) {
    goog.vec.Vec3.add(position, editable.getPosition(), position);
  }, this);
  goog.vec.Vec3.scale(position, 1 / this.editables_.length, position);
  return position;
};



/**
 * Collection of object parts.
 *
 * @param {!Array<shapy.editor.Editable>} parts
 *
 * @constructor
 * @extends {shapy.editor.Editable}
 */
shapy.editor.PartsGroup = function(parts) {
  shapy.editor.EditableGroup.call(
      this, parts, shapy.editor.Editable.Type.PARTS_GROUP);
};
goog.inherits(shapy.editor.PartsGroup, shapy.editor.EditableGroup);


/**
 * Translate the group
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.PartsGroup.prototype.translate = function(x, y, z) {
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
 * Delete the parts from the mesh
 */
shapy.editor.EditableGroup.prototype.delete = function() {
  goog.object.forEach(this.editables_, function(editable) {
    editable.delete();
  }, this);
  this.editables_ = null;
};


/**
 * Returns the object if all selected parts are from the same object.
 *
 * @return {shapy.editor.Object}
 */
shapy.editor.PartsGroup.prototype.getObject = function() {
  if (goog.array.isEmpty(this.editables_)) {
    return null;
  }
  var object = this.editables_[0].object;
  var same = goog.array.every(this.editables_, function(e) {
      return e.object == object;
  });

  return same ? object : null;
};


/**
 * Retrives the vertices forming this group.
 *
 * @return {!Array<!shapy.editor.Object.Vertex>}
 */
shapy.editor.PartsGroup.prototype.getVertices = function() {
  var verts = goog.array.flatten(goog.array.map(this.editables_, function(e) {
    return e.getVertices();
  }, this));
  goog.array.removeDuplicates(verts);
  return verts;
};



/**
 * Collection of objects.
 *
 * @param {!Array<shapy.editor.Editable>} objects
 *
 * @constructor
 * @extends {shapy.editor.Editable}
 */
shapy.editor.ObjectGroup = function(objects) {
  shapy.editor.EditableGroup.call(
      this, objects, shapy.editor.Editable.Type.OBJECT_GROUP);
};
goog.inherits(shapy.editor.ObjectGroup, shapy.editor.EditableGroup);


/**
 * Translate the group
 *
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
shapy.editor.ObjectGroup.prototype.translate = function(x, y, z) {
  var mid = this.getPosition();

  // Apply translation to each object
  goog.object.forEach(this.editables_, function(object) {
    var delta = goog.vec.Vec3.createFloat32FromValues(x, y, z);
    goog.vec.Vec3.subtract(delta, mid, delta);
    goog.vec.Vec3.add(delta, object.getPosition(), delta);
    object.translate(delta[0], delta[1], delta[2]);
  });
};


/**
 * Delete the objects.
 */
shapy.editor.EditableGroup.prototype.delete = function() {

};



/**
 * List of editable types.
 * @enum {string}
 */
shapy.editor.Editable.Type = {
  OBJECT_GROUP: 'objectGroup',
  PARTS_GROUP: 'partsGroup',
  OBJECT: 'object',
  VERTEX: 'vertex',
  EDGE: 'edge',
  FACE: 'face'
};



/**
 * Selection mode.
 *
 * @constructor
 */
shapy.editor.Mode = function() {
  this.object = true;
  this.vertex = false;
  this.edge = false;
  this.face = false;
  this.partsGroup = false;
  this.objectGroup = true;
};


/**
 * Toggle object mode.
 */
shapy.editor.Mode.prototype.toggleObject = function() {
  if (this.object) {
    this.object = this.objectGroup = false;
    this.vertex = this.edge = this.face = this.partsGroup = true;
  } else {
    this.object = this.objectGroup = true;
    this.vertex = false;
    this.edge = false;
    this.face = false;
    this.partsGroup = false;
  }
};


/**
 * Toggle face mode.
 */
shapy.editor.Mode.prototype.toggleFace = function() {
  this.face = !this.face;
  this.partsGroup = this.face || this.edge || this.vertex;  
  this.object = this.objectGroup = !this.partsGroup;
};


/**
 * Toggle edge mode.
 */
shapy.editor.Mode.prototype.toggleEdge = function() {
  this.edge = !this.edge;
  this.partsGroup = this.face || this.edge || this.vertex;
  this.object = this.objectGroup = !this.partsGroup;
};


/**
 * Toggle vertex mode.
 */
shapy.editor.Mode.prototype.toggleVertex = function() {
  this.vertex = !this.vertex;
  this.partsGroup = this.face || this.edge || this.vertex;  
  this.object = this.objectGroup = !this.partsGroup;
};
