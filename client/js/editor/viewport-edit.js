// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Viewport.Edit');

goog.require('shapy.editor.Viewport');


/**
 * Viewport for the 3D editor.
 *
 * @constructor
 * @extends {shapy.editor.Viewport}
 *
 * @param {string} name Name of the viewport.
 */
shapy.editor.Viewport.Edit = function(name) {
  shapy.editor.Viewport.call(this, name, shapy.editor.Viewport.Type.EDIT);

  /**
   * The camera attached to the viewport.
   * @public {!shapy.editor.Camera}
   * @const
   */
  this.camera = new shapy.editor.Camera.Persp();

  /**
   * Control cube attached to the viewport.
   * @public {!shapy.editor.CamCube}
   * @const
   */
  this.camCube = new shapy.editor.CamCube(this, this.camera);

  /**
   * Flag indicating if the camera is rotating.
   * @private {boolean}
   */
   this.isRotating_ = false;

  /**
   * Flag indicating if the camera is panning.
   * @private {boolean}
   */
   this.isPanning_ = false;

  /**
   * Active rig.
   * @public {shapy.editor.Rig}
   */
  this.rig = null;
};
goog.inherits(shapy.editor.Viewport.Edit, shapy.editor.Viewport);



/**
 * Returns the ray that corresponds to the current mouse position.
 *
 * @private
 *
 * @param {number} x Mouse X position.
 * @param {number} y Mouse Y position.
 *
 * @return {!goog.vec.Ray.Type} Ray passing through point.
 */
shapy.editor.Viewport.Edit.prototype.raycast_ = function(x, y) {
  return this.camera.raycast(2 * x / this.rect.w - 1, 2 * y / this.rect.h - 1);
};


/**
 * Returns the frustum that corresponds to a group selection.
 *
 * @param {!goog.math.Rect} rect Selection rectangle.
 *
 * @return {!goog.vec.Ray.Type} Ray passing through point.
 */
shapy.editor.Viewport.Edit.prototype.groupcast = function(rect) {
  return this.camera.groupcast(
      2 * rect.left / this.rect.w - 1,
      2 * rect.top / this.rect.h - 1,
      2 * (rect.left + rect.width) / this.rect.w - 1,
      2 * (rect.top + rect.height) / this.rect.h - 1);
};


/**
 * Resizes the viewport.Edit, specifying a new position and size.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
shapy.editor.Viewport.Edit.prototype.resize = function(x, y, w, h) {
  shapy.editor.Viewport.prototype.resize.call(this, x, y, w, h);
  this.camCube.resize(w, h);
  this.camera.resize(w, h);
};


/**
 * Handles a mouse motion event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Viewport.Edit.prototype.mouseMove = function(x, y) {
  this.currMousePos_.x = x;
  this.currMousePos_.y = y;

  if (this.camCube.mouseMove(x, y)) {
    return null;
  }

  var ray = this.raycast_(x, y);
  if (this.isRotating_) {
    this.rotate();
    return null;
  }
  if (this.isPanning_) {
    this.pan();
    return null;
  }
  if (this.rig && this.rig.mouseMove(ray)) {
    return null;
  }
  if (this.group) {
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

    if (this.group.width > 3 && this.group.height > 3) {
      return null;
    }
  }
  return ray;
};


/**
 * Handles a mouse enter event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 */
shapy.editor.Viewport.Edit.prototype.mouseEnter = function(x, y) {
  this.group = null;
  if (this.rig) {
    this.rig.mouseEnter(this.raycast_(x, y));
  }
};


/**
 * Handles a mouse leave event.
 */
shapy.editor.Viewport.Edit.prototype.mouseLeave = function() {
  this.group = null;
  if (!this.isRotating_ && !this.isPanning_ && this.rig) {
    this.rig.mouseLeave();
  }
  this.isRotating_ = false;
  this.isPanning_ = false;
};


/**
 * Handles a mouse press event.
 *
 * @param {number} x      Mouse X coordinate.
 * @param {number} y      Mouse Y coordinate.
 * @param {number} button Mouse button that was clicked.
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Viewport.Edit.prototype.mouseDown = function(x, y, button) {
  var ray = this.raycast_(x, y);
  this.lastClick_.x = x;
  this.lastClick_.y = y;
  this.currMousePos_.x = x;
  this.currMousePos_.y = y;
  this.lastMousePos_.x = x;
  this.lastMousePos_.y = y;

  if (this.camCube.mouseDown(x, y)) {
    return null;
  }

  switch (button) {
    case 1: {
      if (this.rig && this.rig.mouseDown(ray)) {
        return null;
      } else {
        this.group = new goog.math.Rect(x, y, 0, 0);
        return ray;
      }
      break;
    }
    case 2: this.isPanning_ = true; return null;
    case 3: this.isRotating_ = true; return null;
  }

  return this.raycast_(x, y);
};


/**
 * Handles a mouse release event.
 *
 * @param {number} x Mouse X coordinate.
 * @param {number} y Mouse Y coordinate.
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Viewport.Edit.prototype.mouseUp = function(x, y) {
  var ray = this.raycast_(x, y);

  this.group = null;
  this.group = null;
  if (this.camCube.mouseUp(x, y)) {
    return null;
  }

  if (!this.isRotating_ && !this.isPanning_ && this.rig) {
    if (this.rig.mouseUp(ray)) {
      return null;
    }
  }

  this.isRotating_ = false;
  this.isPanning_ = false;
  return ray;
};


/**
 * Handles a mouse wheel event.
 *
 * @param {number} delta Mouse wheel delta value.
 */
shapy.editor.Viewport.Edit.prototype.mouseWheel = function(delta) {
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
 * Recomputes the positions & sizes of all viewport.Edits.
 *
 * @param {number} kc Keycode
 */
shapy.editor.Viewport.Edit.prototype.keyDown = function(kc) {
};


/**
 * Computes a normalised vector from the center of the virtual ball to
 * the point on the virtual ball surface that is aligned with the point (x, y)
 * on the screen.
 *
 * @private
 *
 * @param {!goog.math.Vec2} pos Position of the mouse.
 *
 * @return {!goog.vec.Vec3.Type} Arcball vector.
 */
shapy.editor.Viewport.Edit.prototype.getArcballVector_ = function(pos) {
  // Convert pos to camera coordinates [-1, 1].
  var p = goog.vec.Vec3.createFloat32FromValues(
      2 * pos.x / this.rect.w - 1.0,
      2 * pos.y / this.rect.h - 1.0,
      0);

  // Compute the square of the l2 norm of p.
  var l2Squared = p[0] * p[0] + p[1] * p[1];

  // Compute the z coordinate.
  if (l2Squared < 1.0) {
    p[2] = Math.sqrt(1 - l2Squared);
  } else {
    goog.vec.Vec3.normalize(p, p);
  }

  return p;
};

/**
 * Computes the angle and axis of the camera rotation.
 */
shapy.editor.Viewport.Edit.prototype.rotate = function() {
  if (this.currMousePos_.equals(this.lastMousePos_)) {
    return;
  }

  // Compute the points at the ball surface that match the click.
  var va = this.getArcballVector_(this.lastMousePos_);
  var vb = this.getArcballVector_(this.currMousePos_);
  this.lastMousePos_.x = this.currMousePos_.x;
  this.lastMousePos_.y = this.currMousePos_.y;

  // Compute the angle.
  var angle = Math.acos(Math.min(1.0, goog.vec.Vec3.dot(va, vb)));

  // Compute the axis.
  var axis = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.cross(va, vb, axis);
  goog.vec.Mat4.multVec3NoTranslate(this.camera.invView, axis, axis);

  // Compute the rotation quaternion from the angle and the axis.
  var rotationQuater = goog.vec.Quaternion.createFloat32();
  goog.vec.Quaternion.fromAngleAxis(-angle, axis, rotationQuater);
  goog.vec.Quaternion.normalize(rotationQuater, rotationQuater);

  // Calculate the view vector.
  var viewVector = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.subtract(this.camera.eye, this.camera.center, viewVector);

  // Compute the quternion from the view vector.
  var viewQuater = goog.vec.Quaternion.createFloat32FromValues(
      viewVector[0],
      viewVector[1],
      viewVector[2],
      0);

  // Compute the new quaternion representing the rotation.
  var temp = goog.vec.Quaternion.createFloat32();
  goog.vec.Quaternion.conjugate(rotationQuater, temp);
  goog.vec.Quaternion.concat(rotationQuater, viewQuater, viewQuater);
  goog.vec.Quaternion.concat(viewQuater, temp, viewQuater);

  // Compute the updated view vector.
  goog.vec.Vec3.setFromValues(
      viewVector,
      viewQuater[0],
      viewQuater[1],
      viewQuater[2]);

  // Compute the new up vector.
  //goog.vec.Vec3.cross(viewVector, this.camera.up, this.camera.up);
  //goog.vec.Vec3.cross(this.camera.up, viewVector, this.camera.up);
  //goog.vec.Vec3.normalize(this.camera.up, this.camera.up);

  // Update the eye.
  goog.vec.Vec3.add(this.camera.center, viewVector, this.camera.eye);
};


/**
 * Performs the paning.
 */
shapy.editor.Viewport.Edit.prototype.pan = function() {
  var left = goog.vec.Vec3.createFloat32();
  var up = goog.vec.Vec3.createFloat32();
  var v = goog.vec.Vec3.createFloat32();

  // Get the normal to the plane along which to rotate.
  goog.vec.Vec3.subtract(this.camera.eye, this.camera.center, v);
  goog.vec.Vec3.cross(v, this.camera.up, left);
  goog.vec.Vec3.normalize(left, left);
  goog.vec.Vec3.cross(left, v, up);
  goog.vec.Vec3.normalize(up, up);

  // Get movement.
  var dx =
      (this.currMousePos_.x - this.lastMousePos_.x) / this.rect.w *
      shapy.editor.Camera.PAN_SPEED;
  var dy =
      (this.currMousePos_.y - this.lastMousePos_.y) / this.rect.h *
      shapy.editor.Camera.PAN_SPEED;

  // Move along x.
  goog.vec.Vec3.scale(left, dx, left);
  goog.vec.Vec3.add(this.camera.center, left, this.camera.center);
  goog.vec.Vec3.add(this.camera.eye, left, this.camera.eye);

  // Move along y.
  goog.vec.Vec3.scale(up, dy, v);
  goog.vec.Vec3.negate(v, v);
  goog.vec.Vec3.add(this.camera.center, v, this.camera.center);
  goog.vec.Vec3.add(this.camera.eye, v, this.camera.eye);

  this.lastMousePos_.x = this.currMousePos_.x;
  this.lastMousePos_.y = this.currMousePos_.y;
};


/**
 * Destroys the viewport.
 */
shapy.editor.Viewport.Edit.prototype.destroy = function() {
  shapy.editor.Viewport.prototype.destroy.call(this);
  this.camCube.destroy();
};
