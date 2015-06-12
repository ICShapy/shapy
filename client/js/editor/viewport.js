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
 * @param {!shapy.editor.Editor}        editor Editor service.
 * @param {string}                      name   Name of the viewport.
 * @param {!shapy.editor.Viewport.Type} type   Type of the viewport.
 */
shapy.editor.Viewport = function(editor, name, type) {
  /** @public {!shapy.editor.Editor} @const */
  this.editor = editor;
  /** @public {!shapy.editor.Viewport.Type} @const */
  this.type = type;
  /** @public {string}  @const */
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
   * The size and position of the viewport.
   * @public {!goog.math.Size}
   * @const
   */
  this.rect = new goog.math.Rect(0, 0, 0, 0);

  /**
   * Last mouse click position.
   * @protected {!goog.math.Vec2}
   */
  this.lastClick = new goog.math.Vec2(0, 0);

  /**
   * Current position of the mouse.
   * @protected {!goog.math.Vec2}
   */
  this.currMousePos = new goog.math.Vec2(0, 0);

  /**
   * Last position of the mouse.
   * @public {!goog.math.Vec2}
   */
  this.lastMousePos = new goog.math.Vec2(0, 0);
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
  this.lastMousePos.x = this.currMousePos.x;
  this.lastMousePos.y = this.currMousePos.y;
  this.currMousePos.x = x;
  this.currMousePos.y = y;

  if (!this.group || this.editor.mode.paint) {
    return false;
  }

  if (x > this.lastClick.x) {
    this.group.width = x - this.lastClick.x;
  } else {
    this.group.width = this.lastClick.x - x;
    this.group.left = x;
  }

  if (y > this.lastClick.y) {
    this.group.height = y - this.lastClick.y;
  } else {
    this.group.height = this.lastClick.y - y;
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
  this.lastClick.x = x;
  this.lastClick.y = y;
  this.currMousePos.x = x;
  this.currMousePos.y = y;
  this.lastMousePos.x = x;
  this.lastMousePos.y = y;

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
shapy.editor.Viewport.prototype.keyDown = function() {
};


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
