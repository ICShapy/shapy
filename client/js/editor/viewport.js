// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Layout');
goog.provide('shapy.editor.Layout.Double');
goog.provide('shapy.editor.Layout.Quad');
goog.provide('shapy.editor.Layout.Single');
goog.provide('shapy.editor.Viewport');

goog.require('goog.math.Rect');
goog.require('goog.math.Size');



/**
 * Class that manages the layout of multiple viewports on the screen.
 *
 * @constructor
 *
 * @param {!Object<string, shapy.editor.Viewport>} viewports Map of viewports.
 */
shapy.editor.Layout = function(viewports) {
  /**
   * Map of all viewports on the screen.
   * @public {!Object<string, shapy.editor.Viewport>}
   * @const
   */
  this.viewports = viewports;

  /**
   * The size of the entire screen.
   * @protected {!goog.math.Size}
   * @const
   */
  this.size = new goog.math.Size(0, 0);

  /**
   * Pointer to the active viewport.
   * @public {!shapy.editor.Viewport}
   */
  this.active = viewports[0];
};


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} w Width of the screen.
 * @param {number} h Height of the screen.
 */
shapy.editor.Layout.prototype.resize = function(w, h) {
  this.size.width = w;
  this.size.height = h;
};


/**
 * Finds out which viewport is touched by the mouse.
 *
 * @private
 *
 * @param {number} x Mouse X position.
 * @param {number} y Mouse Y position.
 *
 * @return {?{ vp: shapy.editor.Viewport, x: number, y: number }}
 */
shapy.editor.Layout.prototype.getViewport_ = function(x, y) {
  for (var name in this.viewports) {
    if (!this.viewports.hasOwnProperty(name)) {
      continue;
    }
    var vp = this.viewports[name];
    if (x < vp.rect.x || vp.rect.x + vp.rect.w < x) {
      continue;
    }
    if (y < vp.rect.y || vp.rect.y + vp.rect.h < y) {
      continue;
    }
    return {
      vp: vp,
      x: x - vp.rect.x,
      y: y - vp.rect.y
    };
  }
  return null;
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.prototype.mouseMove = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || !result.vp) {
    return;
  }

  if (this.active && result.vp == this.active) {
    this.active.mouseMove(result.x, result.y);
  } else {
    if (this.active) {
      this.active.mouseLeave();
    }

    this.active = result.vp;
    this.active.mouseEnter(result.x, result.y);
  }
};


/**
 * Handles a mouse press event.
 *
 * @param {MouseEvent} e Original event.
 */
shapy.editor.Layout.prototype.mouseDown = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || !result.vp) {
    return;
  }

  result.vp.mouseDown(result.x, result.y);
};


/**
 * Handles a mouse release event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.prototype.mouseUp = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || !result.vp) {
    return;
  }

  result.vp.mouseUp(result.x, result.y);
};


/**
 * Handles a mouse enter event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.prototype.mouseEnter = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || result.vp) {
    return;
  }

  this.active = result.vp;
  this.active.mouseEnter(result.x, result.y);
};


/**
 * Handles a mouse leave event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.prototype.mouseLeave = function(e) {
  if (!this.active) {
    return;
  }

  this.active.mouseLeave();
  this.active = null;
};


/**
 * Handles a mouse wheel event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.prototype.mouseWheel = function(e) {
  if (!this.active) {
    return;
  }

  this.active.mouseWheel(e.originalEvent.wheelDelta);
};



/**
 * Creates a layout with a single viewport.
 *
 * @constructor
 * @extends {shapy.editor.Layout}
 */
shapy.editor.Layout.Single = function() {
  /** @public {!shapy.editor.Viewport} @const */
  this.viewport = new shapy.editor.Viewport('viewport');

  shapy.editor.Layout.call(this, {
      'viewport': this.viewport
  });
};
goog.inherits(shapy.editor.Layout.Single, shapy.editor.Layout);


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} w Width of the window.
 * @param {number} h Height of the window.
 */
shapy.editor.Layout.Single.prototype.resize = function(w, h) {
  goog.base(this, 'resize', w, h);

  this.viewport.resize(0, 0, w, h);
};



/**
 * Creates a layout by splitting the screen into 2 vertically.
 *
 * @constructor
 * @extends {shapy.editor.Layout}
 */
shapy.editor.Layout.Double = function() {
  /** @public {!shapy.editor.Viewport} @const */
  this.left = new shapy.editor.Viewport('left');
  /** @public {!shapy.editor.Viewport} @const */
  this.right = new shapy.editor.Viewport('right');

  /** @private {number} */
  this.split_ = 0.5;
  /** @private {number} */
  this.bar_ = 0;
  /** @private {boolean} */
  this.hover_ = false;
  /** @private {boolean} */
  this.resize_ = false;

  shapy.editor.Layout.call(this, {
      'left': this.left,
      'right': this.right,
  });
};
goog.inherits(shapy.editor.Layout.Double, shapy.editor.Layout);


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} w Width of the window.
 * @param {number} h Height of the window.
 */
shapy.editor.Layout.Double.prototype.resize = function(w, h) {
  goog.base(this, 'resize', w, h);

  this.bar_ = w * this.split_;
  this.left.resize(0, 0, w * this.split_, h);
  this.right.resize(w * this.split_, 0, w * (1 - this.split_), h);
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.Double.prototype.mouseMove = function(e) {
  this.hover_ = Math.abs(e.offsetX - this.bar_) < 5;

  if (this.resize_) {
    this.split_ = e.offsetX / this.size.width;
    this.split_ = Math.max(0.1, Math.min(0.9, this.split_));
    this.resize(this.size.width, this.size.height);
  }

  if (this.hover_) {
    $('html,body').css('cursor', 'ew-resize');
  } else {
    $('html,body').css('cursor', 'auto');
    goog.base(this, 'mouseMove', e);
  }
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.Double.prototype.mouseDown = function(e) {
  this.resize_ = this.hover_;
  if (!this.resize_) {
    goog.base(this, 'mouseDown', e);
  }
};


/**
 * Handles a mouse up event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.Double.prototype.mouseUp = function(e) {
  if (!this.resize_) {
    goog.base(this, 'mouseUp', e);
  }
  this.hover_ = this.resize_ = false;
};


/**
 * Handles a mouse leave event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.Double.prototype.mouseLeave = function(e) {
  if (!this.resize) {
    goog.base(this, 'mouseLeave', e);
  }
  this.hover_ = this.resize_ = false;
};



/**
 * Creates a layout by splitting the screen into 4 viewport.
 *
 * @constructor
 * @extends {shapy.editor.Layout}
 */
shapy.editor.Layout.Quad = function() {
  /** @public {!shapy.editor.Viewport} @const */
  this.topLeft = new shapy.editor.Viewport('top-left');
  /** @public {!shapy.editor.Viewport} @const */
  this.topRight = new shapy.editor.Viewport('top-right');
  /** @public {!shapy.editor.Viewport} @const */
  this.bottomLeft = new shapy.editor.Viewport('bottom-left');
  /** @public {!shapy.editor.Viewport} @const */
  this.bottomRight = new shapy.editor.Viewport('bottom-right');

  /** @private {number} */
  this.splitX_ = 0.5;
  /** @private {number} */
  this.barX_ = 0;
  /** @private {boolean} */
  this.hoverX_ = false;
  /** @private {boolean} */
  this.resizeX_ = false;

  /** @private {number} */
  this.splitY_ = 0.5;
  /** @private {number} */
  this.barY_ = 0;
  /** @private {boolean} */
  this.resizeY_ = false;
  /** @private {boolean} */
  this.hoverY_ = false;

  shapy.editor.Layout.call(this, {
      'top-left': this.topLeft,
      'top-right': this.topRight,
      'bottom-left': this.bottomLeft,
      'bottom-right': this.bottomRight
  });
};
goog.inherits(shapy.editor.Layout.Quad, shapy.editor.Layout);


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} w Width of the window.
 * @param {number} h Height of the window.
 */
shapy.editor.Layout.Quad.prototype.resize = function(w, h) {
  goog.base(this, 'resize', w, h);

  this.barX_ = w * this.splitX_;
  this.barY_ = h * this.splitY_;

  this.topLeft.resize(
      0,
      0,
      w * this.splitX_,
      h * this.splitY_);
  this.topRight.resize(
      w * this.splitX_,
      0,
      w * (1 - this.splitX_),
      h * this.splitY_);
  this.bottomLeft.resize(
      0,
      h * this.splitY_,
      w * this.splitX_,
      h * (1 - this.splitY_));
  this.bottomRight.resize(
      w * this.splitX_,
      h * this.splitY_,
      w * (1 - this.splitX_),
      h * (1 - this.splitY_));
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.Quad.prototype.mouseMove = function(e) {
  this.hoverX_ = Math.abs(e.offsetX - this.barX_) < 5;
  this.hoverY_ = Math.abs(e.offsetY - this.barY_) < 5;

  if (this.resizeX_) {
    this.splitX_ = e.offsetX / this.size.width;
    this.splitX_ = Math.max(0.1, Math.min(0.9, this.splitX_));
  }
  if (this.resizeY_) {
    this.splitY_ = e.offsetY / this.size.height;
    this.splitY_ = Math.max(0.1, Math.min(0.9, this.splitY_));
  }

  if (this.resizeX_ || this.resizeY_) {
    this.resize(this.size.width, this.size.height);
  }

  if (this.hoverX_ && this.hoverY_) {
    $('html,body').css('cursor', 'move');
  } else if (this.hoverX_) {
    $('html,body').css('cursor', 'ew-resize');
  } else if (this.hoverY_) {
    $('html,body').css('cursor', 'ns-resize');
  } else {
    $('html,body').css('cursor', 'auto');
    goog.base(this, 'mouseMove', e);
  }
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.Quad.prototype.mouseDown = function(e) {
  this.resizeX_ = this.hoverX_;
  this.resizeY_ = this.hoverY_;

  if (!this.resizeX_ && !this.resizeY_) {
    goog.base(this, 'mouseDown', e);
  }
};


/**
 * Handles a mouse up event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.Quad.prototype.mouseUp = function(e) {
  if (!this.resizeX_ && !this.resizeY_) {
    goog.base(this, 'mouseUp', e);
  }
  this.hoverX_ = this.hoverY_ = this.resizeX_ = this.resizeY_ = false;
};


/**
 * Handles a mouse leave event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.Quad.prototype.mouseLeave = function(e) {
  if (!this.resizeX_ && !this.resizeY_) {
    goog.base(this, 'mouseLeave', e);
  }
  this.hoverX_ = this.hoverY_ = this.resizeX_ = this.resizeY_ = false;
};



/**
 * A single viewport, our eye into the world.
 *
 * @constructor
 *
 * @param {string} name Name of the viewport.
 */
shapy.editor.Viewport = function(name) {
  /**
   * The name of the viewport.
   * @public {string}
   * @const
   */
  this.name = name;

  /**
   * The camera attached to the viewport.
   * @public {!shapy.editor.Camera}
   * @const
   */
  this.camera = new shapy.editor.Camera.Persp();

  /**
   * The size and position of the viewport.
   * @public {!goog.math.Size}
   * @const
   */
  this.rect = new goog.math.Rect(0, 0, 0, 0);

  /**
   * Type of the viewport.
   * @public {!shapy.editor.Viewport.Type}
   */
  this.type = shapy.editor.Viewport.Type.PERSPECTIVE;
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
  this.camera.resize(w, h);
};


/**
 * Handles a mouse motion event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.prototype.mouseMove = function(x, y) {
};


/**
 * Handles a mouse enter event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.prototype.mouseEnter = function(x, y) {
  //console.log('enter', x, y);
};


/**
 * Handles a mouse leave event.
 */
shapy.editor.Viewport.prototype.mouseLeave = function() {
  //console.log('leave');
};


/**
 * Handles a mouse press event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.prototype.mouseDown = function(x, y) {
  //console.log('down', x, y);
};


/**
 * Handles a mouse release event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.prototype.mouseUp = function(x, y) {
  //console.log('up', x, y);
};


/**
 * Handles a mouse wheel event.
 *
 * @param {number} delta Mouse wheel delta value.
 */
shapy.editor.Viewport.prototype.mouseWheel = function(delta) {
  var diff = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.subtract(this.camera.eye, this.camera.center, diff);
  var zoomLevel = goog.vec.Vec3.magnitude(diff);

  // Determine if zooming in or out and update accordingly.
  if (delta < 0) {
    zoomLevel /= shapy.editor.Camera.ZOOM_SPEED;
  } else {
    zoomLevel *= shapy.editor.Camera.ZOOM_SPEED;
  }

  // Clip to MIN_ZOOM.
  if (zoomLevel < shapy.editor.Camera.MIN_ZOOM) {
    zoomLevel = shapy.editor.Camera.MIN_ZOOM;
  }

  // Clip to MAX_ZOOM.
  if (zoomLevel > shapy.editor.Camera.MAX_ZOOM) {
    zoomLevel = shapy.editor.Camera.MAX_ZOOM;
  }

  // Update the position of the camera.
  goog.vec.Vec3.normalize(diff, diff);
  goog.vec.Vec3.scale(diff, zoomLevel, diff);
  goog.vec.Vec3.add(this.camera.center, diff, this.camera.eye);
};



/**
 * List of viewport types.
 * @enum {number}
 */
shapy.editor.Viewport.Type = {
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
  FRONT: 'front',
  BACK: 'back',
  ORTHO: 'ortho',
  PERSPECTIVE: 'perp'
};
