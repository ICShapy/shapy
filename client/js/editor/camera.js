// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Camera');
goog.provide('shapy.editor.Camera.Ortho');
goog.provide('shapy.editor.Camera.Persp');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec3');



/**
 * Camera class.
 *
 * @constructor
 */
shapy.editor.Camera = function() {
  /** @public {!goog.vec.Mat4} @const */
  this.proj = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4} @const */
  this.view = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4} @const */
  this.vp = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Vec3} @const */
  this.up = goog.vec.Vec3.createFloat32FromValues(0, 1, 0);
  /** @public {!goog.vec.Vec3} @const */
  this.eye = goog.vec.Vec3.createFloat32FromValues(8, 8, 8);
  /** @public {!goog.vec.Vec3} @const */
  this.center = goog.vec.Vec3.createFloat32FromValues(0, 0, 0);
};


/**
 * Recomputes the matrices.
 *
 * @public
 */
shapy.editor.Camera.prototype.compute = goog.abstractMethod;


/**
 * Resize the camera, usually affects aspect ratio of perspective cameras.
 *
 * @public
 */
shapy.editor.Camera.prototype.resize = goog.abstractMethod;


/**
 * Maximum zoom level.
 * @param {number} @const
 */
shapy.editor.Camera.MAX_ZOOM = 20.0;


/**
 * Maximum zoom level.
 * @param {number} @const
 */
shapy.editor.Camera.MIN_ZOOM = 0.5;


/**
 * Zoom speed.
 * @param {number} @const
 */
shapy.editor.Camera.ZOOM_SPEED = 0.85;



/**
 * Perspective camera.
 *
 * @constructor
 * @extends {shapy.editor.Camera}
 */
shapy.editor.Camera.Persp = function() {
  shapy.editor.Camera.call(this);

  /** @public {number} */
  this.aspect = 16.0 / 9.0;
  /** @public {number} */
  this.znear = 0.1;
  /** @public {number} */
  this.zfar = 100.0;
  /** @public {number} */
  this.fov = 45.0;
};
goog.inherits(shapy.editor.Camera.Persp, shapy.editor.Camera);


/**
 * Camera matrices.
 */
shapy.editor.Camera.Persp.prototype.compute = function() {
  goog.vec.Mat4.makeLookAt(
      this.view, this.eye, this.center, this.up);
  goog.vec.Mat4.makePerspective(
      this.proj, this.fov, this.aspect, this.znear, this.zfar);
  goog.vec.Mat4.multMat(this.proj, this.view, this.vp);
};


/**
 * On resize
 */
shapy.editor.Camera.Persp.prototype.resize = function(w, h) {
  this.aspect = w / h;
  this.compute();
};



/**
 * Ortho camera.
 *
 * @constructor
 * @extends {shapy.editor.Camera}
 */
shapy.editor.Camera.Ortho = function() {
  shapy.editor.Camera.call(this);

  this.znear = 0.1;
  this.zfar = 100;
  this.offset_ = goog.vec.Vec3.createFloat32();
};
goog.inherits(shapy.editor.Camera.Ortho, shapy.editor.Camera);


/**
 * Camera matrices.
 */
shapy.editor.Camera.Ortho.prototype.compute = function() {
  // The width and height of the frustum should be equal to the distance of the
  // eye from it's center (or, the size should be the width/height over 2)
  goog.vec.Vec3.subtract(this.eye, this.center, this.offset_);
  var fSize = goog.vec.Vec3.magnitude(this.offset_) * 0.5;

  goog.vec.Mat4.makeLookAt(
      this.view, this.eye, this.center, this.up);
  goog.vec.Mat4.makeOrtho(
      this.proj, -fSize, fSize, -fSize, fSize, this.znear, this.zfar);
  goog.vec.Mat4.multMat(this.proj, this.view, this.vp);
};


/**
 * On resize
 */
shapy.editor.Camera.Ortho.prototype.resize = function(w, h) {
};
