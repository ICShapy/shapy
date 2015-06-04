// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Viewport');

goog.require('goog.math.Rect');
goog.require('goog.math.Vec2');
goog.require('goog.vec.Quaternion');



/**
 * A single viewport, our eye into the world.
 *
 * @constructor
 *
 * @param {string}                      name Name of the viewport.
 * @param {!shapy.editor.Viewport.Type} type Type of the viewport.
 */
shapy.editor.Viewport = function(name, type) {
  /**
   * @public {!shapy.editor.Viewport.Type}
   * @const
   */
  this.type = type;

  /**
   * The name of the viewport.
   * @public {string}
   * @const
   */
  this.name = name;

  /**
   * Flag indicating if the viewport is active, i.e. it is highlighted.
   * @public {boolean}
   */
  this.active = false;

  /**
   * Group select rectangle.
   * @public {goog.math.Rect}
   */
  this.group = null;

  /**
   * Last mouse click position.
   * @private {!goog.math.Vec2}
   */
  this.lastClick_ = new goog.math.Vec2(0, 0);

  /**
   * The size and position of the viewport.
   * @public {!goog.math.Size}
   * @const
   */
  this.rect = new goog.math.Rect(0, 0, 0, 0);

  /**
   * Current position of the mouse.
   * @private {!goog.math.Vec2}
   */
  this.currMousePos_ = new goog.math.Vec2(0, 0);

  /**
   * Last position of the mouse.
   * @private {!goog.math.Vec2}
   */
  this.lastMousePos_ = new goog.math.Vec2(0, 0);
};


/**
 * Resizes the viewport, specifying a new position and size.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
shapy.editor.Viewport.prototype.resize = function(x, y, w, h) {
  this.rect.x = x;
  this.rect.y = y;
  this.rect.w = w;
  this.rect.h = h;
};


/**
 * Handles a mouse motion event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 *
 * @return {boolean}
 */
shapy.editor.Viewport.prototype.mouseMove = function(x, y) {
  this.currMousePos_.x = x;
  this.currMousePos_.y = y;

  if (!this.group) {
    return false;
  }

  if (x > this.lastClick_.x) {
    this.group.width = x - this.lastClick_.x;
  } else {
    this.group.width = this.lastClick_.x - x;
    this.group.left = x;
  }

  if (y > this.lastClick_.y) {
    this.group.height = y - this.lastClick_.y;
  } else {
    this.group.height = this.lastClick_.y - y;
    this.group.top = y;
  }

  return this.group.width > 3 && this.group.height > 3;
};


/**
 * Handles a mouse enter event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.prototype.mouseEnter = function(x, y) {
  this.group = null;
};


/**
 * Handles a mouse leave event.
 */
shapy.editor.Viewport.prototype.mouseLeave = function() {
  this.group = null;
};


/**
 * Handles a mouse press event.
 *
 * @param {number} x      Mouse X coordinate.
 * @param {number} y      Mouse Y coordinate.
 * @param {number} button Mouse button that was clicked.
 */
shapy.editor.Viewport.prototype.mouseDown = function(x, y, button) {
  this.lastClick_.x = x;
  this.lastClick_.y = y;
  this.currMousePos_.x = x;
  this.currMousePos_.y = y;
  this.lastMousePos_.x = x;
  this.lastMousePos_.y = y;

  if (button == 1) {
    this.group = new goog.math.Rect(x, y, 0, 0);
  }
};


/**
 * Handles a mouse release event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.prototype.mouseUp = function(x, y) {
  this.group = null;
};


/**
 * Handles a mouse wheel event.
 *
 * @param {number} delta Mouse wheel delta value.
 */
shapy.editor.Viewport.prototype.mouseWheel = goog.abstractMethod;


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} kc Keycode
 */
shapy.editor.Viewport.prototype.keyDown = goog.abstractMethod;


/**
 * Destroys the viewport.
 */
shapy.editor.Viewport.prototype.destroy = function() {
};


/**
 * Enumeration of viewport types.
 * @enum {string}
 */
shapy.editor.Viewport.Type = {
  UV: 'uv',
  EDIT: 'edit'
};
