// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Layout');
goog.provide('shapy.editor.Layout.Single');
goog.provide('shapy.editor.Layout.Double');
goog.provide('shapy.editor.Layout.Quad');
goog.provide('shapy.editor.Viewport');

goog.require('goog.math.Rect');
goog.require('goog.math.Size');
goog.require('goog.vec.Vec2');



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
  y = this.size.height - y;
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

  this.active.mouseWheel(e.wheelDelta);
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

  this.left.resize(0, 0, w / 2, h);
  this.right.resize(w / 2, 0, w / 2, h);
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

  this.topLeft.resize(0, 0, w / 2, h / 2);
  this.topRight.resize(w / 2, 0, w / 2, h / 2);
  this.bottomLeft.resize(0, h / 2, w / 2, h / 2);
  this.bottomRight.resize(w / 2, h / 2, w / 2, h / 2);
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
   * The cube camera attached to the viewport.
   * @public {!shapy.editor.Camera}
   * @const
   */
  this.cubeCamera = new shapy.editor.Camera.Cube(this.camera);

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

  /**
   * Current position of the mouse.
   * @private {!goog.vec.Vec2.Float32}
   */
  this.currMousePos = goog.vec.Vec2.createFloat32();

  /**
   * Last position of the mouse.
   * @private {!goog.vec.Vec2.Float32}
   */
  this.lastMousePos = goog.vec.Vec2.createFloat32();

  /**
   * Flag indicating if the mouse is down.
   * @privaet {boolean}
   */
   this.isDown = false;
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
  if (this.isDown) {
    goog.vec.Vec2.setFromValues(this.currMousePos, x, y);
    // TODO: call rotate
  }
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
  if (this.isDown) {
    this.isDown = false;
  }
};


/**
 * Handles a mouse press event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.prototype.mouseDown = function(x, y) {
  goog.vec.Vec2.setFromValues(this.currMousePos, x, y);
  goog.vec.Vec2.setFromValues(this.lastMousePos, x, y);
  this.isDown = true;
};


/**
 * Handles a mouse release event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.prototype.mouseUp = function(x, y) {
  this.isDown = false;
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
 * Computes a normalised vector from the center of the virtual ball to
 * the point on the virtual ball surface that is aligned with the point (x, y)
 * on the screen.
 *
 * @param {!goog.vec.Vec2.Float32} pos Position of the mouse.
 */
shapy.editor.Viewport.prototype.getArcballVector = function(pos) {
  // Convert pos to camera coordinates [-1, 1].
  var p = goog.vec.Vec3.createFloat32FromValues(pos[0] / this.rect.w * 2 - 1.0,
                                                pos[1] / this.rect.h * 2 - 1.0,
                                                0);
  // Compute the square of the l2 norm of p.
  var l2Squared = p[0] * p[0] + p[1] * p[1];

  // Compute the z coordinate.
  if (l2Squared < 1.0) {
    // Use Pythagoras to get z.
    p[2] = Math.sqrt(1 - l2Squared);
  } else {
    // Get the nearest point on the surface of the ball.
    goog.vec.Vec3.normalize(p, p);
  }

  return p;
};

/**
 * Computes the angle and axis of the camera rotation.
 */
shapy.editor.Viewport.prototype.rotate = function() {
  // Compute the points at the ball surface that match the click.
  var va = this.getArcballVector(this.lastMousePos);
  var vb = this.getArcballVector(this.currMousePos);

  // Compute the angle.
  var angle = Math.acos(Math.min(1.0, goog.vec.Vec3.dot(va, vb)));

  // Compute the axis.
  // TODO: finish
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
