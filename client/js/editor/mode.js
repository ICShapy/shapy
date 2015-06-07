// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Mode');



/**
 * Selection mode.
 *
 * @constructor
 */
shapy.editor.Mode = function() {
  this.object = true;
  this.paint = false;
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
    this.vertex = this.edge = this.face = this.partsGroup = this.paint = false;
  }
};


/**
 * Toggle paint mode.
 */
shapy.editor.Mode.prototype.togglePaint = function() {
  if (this.paint) {
    this.object = true;
    this.paint = false;
  } else {
    this.object = this.vertex = this.edge = this.face = false;
    this.paint = true;
  }
};


/**
 * Goes to object mode.
 */
shapy.editor.Mode.prototype.setObject = function() {
  if (!this.object) {
    this.toggleObject();
  }
};


/**
 * Toggle face mode.
 */
shapy.editor.Mode.prototype.toggleFace = function() {
  this.face = !this.face;
  this.partsGroup = this.face || this.edge || this.vertex;
  this.object = this.paint = this.objectGroup = !this.partsGroup;
};


/**
 * Toggle edge mode.
 */
shapy.editor.Mode.prototype.toggleEdge = function() {
  this.edge = !this.edge;
  this.partsGroup = this.face || this.edge || this.vertex;
  this.object = this.paint = this.objectGroup = !this.partsGroup;
};


/**
 * Toggle vertex mode.
 */
shapy.editor.Mode.prototype.toggleVertex = function() {
  this.vertex = !this.vertex;
  this.partsGroup = this.face || this.edge || this.vertex;
  this.object = this.paint = this.objectGroup = !this.partsGroup;
};
