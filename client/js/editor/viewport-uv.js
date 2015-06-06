// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Viewport.UV');

goog.require('goog.math.Vec2');
goog.require('goog.vec.Mat4');
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
  this.zoom = shapy.editor.Viewport.UV.MAX_ZOOM;

  /**
   * True if view is being panned.
   * @private {boolean}
   */
  this.isPanning_ = false;

  /**
   * Pan position.
   * @public {!goog.math.Vec2} @const
   */
  this.pan = new goog.math.Vec2(0, 0);

  /**
   * Initial pan.
   * @private {!goog.math.Vec2} @const
   */
  this.initialPan_ = new goog.math.Vec2(0, 0);

  /**
   * View matrix.
   * @public {!goog.vec.Mat4.Type} @const
   */
  this.view = goog.vec.Mat4.createFloat32();

  /**
   * Projection matrix.
   * @public {!goog.vec.Mat4.Type} @const
   */
  this.proj = goog.vec.Mat4.createFloat32();

  /**
   * VP matrix.
   * @public {!goog.vec.Mat4.Type} @const
   */
  this.vp = goog.vec.Mat4.createFloat32();

  /**
   * Inverse vp matrix.
   * @public {!goog.vec.Mat4.Type} @const
   */
  this.invVp = goog.vec.Mat4.createFloat32();

  /**
   * Aspect ratio.
   * @public {number}
   */
  this.aspect = 1.0;

  /**
   * Object being edited.
   * @public {!shapy.editor.Object}
   */
  this.object = null;
};
goog.inherits(shapy.editor.Viewport.UV, shapy.editor.Viewport);


/**
 * Size of the background.
 */
shapy.editor.Viewport.UV.SIZE = 10;


/**
 * Max zoom.
 */
shapy.editor.Viewport.UV.MAX_ZOOM = 40.0;

/**
 * Min zoom.
 */
shapy.editor.Viewport.UV.MIN_ZOOM = 2.0;


/**
 * Computes the matrices.
 *
 * @private
 */
shapy.editor.Viewport.UV.prototype.compute_ = function() {
  var d, w = shapy.editor.Viewport.UV.SIZE;

  // Clip zoom level.
  this.zoom = Math.max(this.zoom, shapy.editor.Viewport.UV.MIN_ZOOM);
  this.zoom = Math.min(this.zoom, shapy.editor.Viewport.UV.MAX_ZOOM);
  d = 1.0 / this.zoom;

  // Compte matrices.
  goog.vec.Mat4.setFromValues(this.view,
      d, 0, 0, 0,
      0, 0, d, 0,
      0, d, 0, 0,
      this.pan.x + 0.5,
      this.pan.y + 0.5, 0, 1);
  goog.vec.Mat4.makeOrtho(this.proj,
      0, 1,
      0, 1 / this.aspect,
      -1, 1);
  goog.vec.Mat4.multMat(this.proj, this.view, this.vp);
  goog.vec.Mat4.invert(this.vp, this.invVp);
};


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
  this.aspect = h == 0 ? 1 : (w / h);
  this.compute_();
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
  if (this.isPanning_) {
    this.pan.x = this.initialPan_.x + (x - this.lastClick.x) / this.rect.w;
    this.pan.y = this.initialPan_.y + (y - this.lastClick.y) / this.rect.w;
    this.compute_();
  }
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
  this.isPanning_ = false;
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
  if (button == 3) {
    this.isPanning_ = true;
    this.initialPan_.x = this.pan.x;
    this.initialPan_.y = this.pan.y;
  }
};


/**
 * Handles a mouse release event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.UV.prototype.mouseUp = function(x, y) {
  shapy.editor.Viewport.prototype.mouseUp.call(this, x, y);
  this.isPanning_ = false;
};


/**
 * Handles a mouse wheel event.
 *
 * @param {number} delta Mouse wheel delta value.
 */
shapy.editor.Viewport.UV.prototype.mouseWheel = function(delta) {
  var old = this.zoom;

  if (delta < 0) {
    this.zoom /= shapy.editor.Camera.ZOOM_SPEED;
  } else if (delta > 0) {
    this.zoom *= shapy.editor.Camera.ZOOM_SPEED;
  }

  // Recompute matrices.
  this.compute_();

  // Adjust mouse to remain over the same point.
  var mx = this.currMousePos.x / this.rect.w - 0.5;
  this.pan.x = mx - ((mx - this.pan.x) * old) / this.zoom;
  var my = this.currMousePos.y / this.rect.w - 0.5 / this.aspect;
  this.pan.y = my - ((my - this.pan.y) * old) / this.zoom;
};
