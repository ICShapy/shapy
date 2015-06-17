// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Viewport.UV');

goog.require('goog.math.Vec2');
goog.require('goog.vec.Mat4');
goog.require('shapy.editor.Viewport');



/**
 * UV viewport for the 3D editor.
 *
 * @constructor
 * @extends {shapy.editor.Viewport}
 *
 * @param {!shapy.editor.Editor}  editor Editor service.
 * @param {string}                name   Name of the viewport.
 */
shapy.editor.Viewport.UV = function(editor, name) {
  shapy.editor.Viewport.call(this, editor, name, shapy.editor.Viewport.Type.UV);

  /**
   * Zoom level.
   * @public {number}
   */
  this.zoomLevel = 30;

  /**
   * Zoom value.
   * @public {number}
   */
  this.zoom = 0;

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

  /**
   * UVs are being moved.
   * @private {boolean}
   */
  this.moveUV_ = false;
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
shapy.editor.Viewport.UV.MIN_ZOOM = -1.0;


/**
 * Zoom speed.
 */
shapy.editor.Viewport.UV.ZOOM_SPEED = 1.0;


/**
 * Computes the matrices.
 *
 * @private
 */
shapy.editor.Viewport.UV.prototype.compute_ = function() {
  var d, w = shapy.editor.Viewport.UV.SIZE;

  // Clamp zoom level.
  this.zoomLevel = Math.max(this.zoomLevel, shapy.editor.Viewport.UV.MIN_ZOOM);
  this.zoomLevel = Math.min(this.zoomLevel, shapy.editor.Viewport.UV.MAX_ZOOM);
  this.zoom = Math.pow(1.1, this.zoomLevel);
  d = 1000 / this.zoom;

  // Clamp pan.
  if (2 * w * d < this.rect.w) {
    this.pan.x = Math.max(this.pan.x, +w * d - this.rect.w / 2);
    this.pan.x = Math.min(this.pan.x, -w * d + this.rect.w / 2);
  } else {
    this.pan.x = Math.max(this.pan.x, -w * d + this.rect.w / 2);
    this.pan.x = Math.min(this.pan.x, +w * d - this.rect.w / 2);
  }
  if (2 * w * d < this.rect.h) {
    this.pan.y = Math.max(this.pan.y, +w * d - this.rect.h / 2);
    this.pan.y = Math.min(this.pan.y, -w * d + this.rect.h / 2);
  } else {
    this.pan.y = Math.max(this.pan.y, -w * d + this.rect.h / 2);
    this.pan.y = Math.min(this.pan.y, +w * d - this.rect.h / 2);
  }

  // Compte matrices.
  goog.vec.Mat4.setFromValues(this.view,
      d, 0, 0, 0,
      0, 0, d, 0,
      0, d, 0, 0,
      this.pan.x,
      this.pan.y, 0, 1);
  goog.vec.Mat4.makeOrtho(this.proj,
      -this.rect.w / 2, this.rect.w / 2,
      -this.rect.h / 2, this.rect.h / 2,
      -1, 1);
  goog.vec.Mat4.multMat(this.proj, this.view, this.vp);
  goog.vec.Mat4.invert(this.vp, this.invVp);
};


/**
 * Returns a selected UV coordinate.
 *
 * @param {number} x
 * @param {number} y
 *
 * @return {!{x: number, y: number}}
 */
shapy.editor.Viewport.prototype.raycast = function(x, y) {
  var d = this.zoom / 1000, w = shapy.editor.Viewport.UV.SIZE;

  return {
    u: (((x - this.rect.w / 2 - this.pan.x) * d) + w) / (2 * w),
    v: (((y - this.rect.h / 2 - this.pan.y) * d) + w) / (2 * w)
  };
};


/**
 * Selects a group of UV elements.
 *
 * @param {!goog.math.Rect} group
 *
 * @return {!{u0: number, u1: number, v0: number, v1: number}}
 */
shapy.editor.Viewport.prototype.groupcast = function(group) {
  var d = this.zoom / 1000, w = shapy.editor.Viewport.UV.SIZE;

  var u0 = group.left, x1 = group.left + group.width;
  var v0 = group.top, y1 = group.top + group.height;

  return {
    u0: (((u0 - this.rect.w / 2 - this.pan.x) * d) + w) / (2 * w),
    u1: (((x1 - this.rect.w / 2 - this.pan.x) * d) + w) / (2 * w),
    v0: (((v0 - this.rect.h / 2 - this.pan.y) * d) + w) / (2 * w),
    v1: (((y1 - this.rect.h / 2 - this.pan.y) * d) + w) / (2 * w)
  };
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
 * @param {number} button
 *
 * @return {boolean}
 */
shapy.editor.Viewport.UV.prototype.mouseMove = function(x, y, button) {
  shapy.editor.Viewport.prototype.mouseMove.call(this, x, y);
  var d = this.zoom / 1000, w = shapy.editor.Viewport.UV.SIZE, dx, dy;

  // Move selected UV group.
  if (this.moveUV_) {
    dx = ((this.currMousePos.x - this.lastMousePos.x) * d) / (2 * w);
    dy = ((this.currMousePos.y - this.lastMousePos.y) * d) / (2 * w);
    console.log(this.editor.partGroup.moveUV);
    this.editor.partGroup.moveUV(dx, dy);
    return [];
  }

  // Pan the view.
  if (this.isPanning_) {
    this.pan.x = this.initialPan_.x + x - this.lastClick.x;
    this.pan.y = this.initialPan_.y + y - this.lastClick.y;
    this.compute_();
    return [];
  }

  // Select objects under the mouse.
  if (this.group && this.group.width > 3 && this.group.height > 3) {
    hits = this.object.pickUVGroup(
        this.groupcast(this.group), this.editor.mode);
  } else {
    hits = this.object.pickUVCoord(
        this.raycast(x, y), this.editor.mode);
    if (hits.length > 1) {
      hits = [hits[hits.length - 1]];
    }
  }

  if (this.editor.mode.paint && button == 1) {
    uv = this.raycast(x, y);
    object = this.object;
    if (!(texture = this.editor.scene_.textures[object.texture])) {
      return [];
    }

    // Paint the texture if the user has the permission.
    if (texture.write) {
      this.paint_(texture, uv.u, uv.v);
    }

    return [];
  }
  return hits;
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
  this.moveUV_ = false;
};


/**
 * Handles a mouse press event.
 *
 * @param {number} x      Mouse X coordinate.
 * @param {number} y      Mouse Y coordinate.
 * @param {number} button Mouse button that was clicked.
 * @param {boolean} keys
 */
shapy.editor.Viewport.UV.prototype.mouseDown = function(x, y, button, keys) {
  shapy.editor.Viewport.prototype.mouseDown.call(this, x, y, button);
  var hits, same, user;

  switch (button) {
    case 1: {
      hits = this.object.pickUVCoord(this.raycast(x, y), this.editor.mode);
      if (goog.array.isEmpty(hits)) {
        return;
      }
      // If clicked on different UVs, select them.
      same = goog.array.some(hits, function(hit) {
        return this.editor.partGroup.contains(hit);
      }, this);
      this.group = null;
      this.moveUV_ = true;

      if (!same && !keys) {
        this.editor.partGroup.setSelected(null);
        this.editor.partGroup.clear();
        this.editor.partGroup.add(this.editor.hover_);
        this.editor.partGroup.setSelected(this.editor.user);
      }
      return;
    }
    case 3: {
      this.isPanning_ = true;
      this.initialPan_.x = this.pan.x;
      this.initialPan_.y = this.pan.y;
      return;
    }
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
  this.moveUV_ = false;
};


/**
 * Handles a mouse wheel event.
 *
 * @param {number} delta Mouse wheel delta value.
 */
shapy.editor.Viewport.UV.prototype.mouseWheel = function(delta) {
  var old = this.zoom;

  // Adjust zoom.
  if (delta < 0) {
    this.zoomLevel += shapy.editor.Viewport.UV.ZOOM_SPEED;
  } else if (delta > 0) {
    this.zoomLevel -= shapy.editor.Viewport.UV.ZOOM_SPEED;
  }

  // Adjust panning.
  this.compute_();
  var mx = this.currMousePos.x - this.rect.w / 2;
  this.pan.x = mx - ((mx - this.pan.x) * old) / this.zoom;
  var my = this.currMousePos.y - this.rect.h / 2;
  this.pan.y = my - ((my - this.pan.y) * old) / this.zoom;
  this.compute_();
};
