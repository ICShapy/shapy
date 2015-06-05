// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Viewport.UV');

goog.require('shapy.editor.Viewport');


/**
 * Viewport for the 3D editor.
 *
 * @constructor
 * @extends {shapy.editor.Viewport}
 *
 * @param {string} name Name of the viewport.
 */
shapy.editor.Viewport.UV = function(name) {
  shapy.editor.Viewport.call(this, name, shapy.editor.Viewport.Type.UV);

  /**
   * Zoom level.
   * @public {number}
   */
  this.zoom = 1;
};
goog.inherits(shapy.editor.Viewport.UV, shapy.editor.Viewport);


/**
 * Resizes the viewport, specifying a new position and size.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
shapy.editor.Viewport.UV.prototype.resize = function(x, y, w, h) {
  shapy.editor.Viewport.prototype.resize.call(this, x, y, w, h);
};



/**
 * Handles a mouse motion event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 *
 * @return {boolean}
 */
shapy.editor.Viewport.UV.prototype.mouseMove = function(x, y) {
  shapy.editor.Viewport.prototype.mouseMove.call(this, x, y);
  return true;
};


/**
 * Handles a mouse enter event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.UV.prototype.mouseEnter = function(x, y) {
  shapy.editor.Viewport.prototype.mouseEnter.call(this, x, y);
};


/**
 * Handles a mouse leave event.
 */
shapy.editor.Viewport.UV.prototype.mouseLeave = function() {
  shapy.editor.Viewport.prototype.mouseLeave.call(this);
};


/**
 * Handles a mouse press event.
 *
 * @param {number} x      Mouse X coordinate.
 * @param {number} y      Mouse Y coordinate.
 * @param {number} button Mouse button that was clicked.
 */
shapy.editor.Viewport.UV.prototype.mouseDown = function(x, y, button) {
  shapy.editor.Viewport.prototype.mouseDown.call(this, x, y, button);
};


/**
 * Handles a mouse release event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.UV.prototype.mouseUp = function(x, y) {
  shapy.editor.Viewport.prototype.mouseUp.call(this, x, y);
};


/**
 * Handles a mouse wheel event.
 *
 * @param {number} delta Mouse wheel delta value.
 */
shapy.editor.Viewport.UV.prototype.mouseWheel = function(delta) {
  if (delta < 0) {
    this.zoom /= shapy.editor.Camera.ZOOM_SPEED;
  } else if (delta > 0) {
    this.zoom *= shapy.editor.Camera.ZOOM_SPEED;
  }

  // Clip to MIN_ZOOM.
  if (this.zoom <= shapy.editor.Camera.MIN_ZOOM) {
    this.zoom = shapy.editor.Camera.MIN_ZOOM;
  }

  // Clip to MAX_ZOOM.
  if (this.zoom >= shapy.editor.Camera.MAX_ZOOM) {
    this.zoom = shapy.editor.Camera.MAX_ZOOM;
  }
};
