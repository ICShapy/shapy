// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.CamCube');



/**
 * Cube displayed in the corner of all viewports that controls the camera.
 *
 * @constructor
 *
 * @param {!shapy.editor.Viewport} viewport
 * @param {!shapy.editor.Camera}   camera
 */
shapy.editor.CamCube = function(viewport, camera) {
  /** @private {!shapy.editor.Viewport} @const */
  this.viewport_ = viewport;
  /** @private {!shapy.editor.Camera} @const*/
  this.camera_ = camera;

  /** @public {number} */
  this.size = 0;

  /** @public {!goog.vec.Mat4.Type} @const */
  this.view = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4.Type} @const */
  this.proj = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4.Type} @const */
  this.vp = goog.vec.Mat4.createFloat32();

  /** @private {!goog.vec.Vec3.Type} @const */
  this.pos_ = goog.vec.Vec3.createFloat32();
};


/**
 * @type {number} @const
 */
shapy.editor.CamCube.SIZE = 120;

/**
 * @type {number} @const
 */
shapy.editor.CamCube.DISTANCE = 5;


/**
 * Resizes the viewport.
 *
 * @param {number} w
 * @param {number} h
 */
shapy.editor.CamCube.prototype.resize = function(w, h) {
  this.size = Math.min(Math.min(w / 3, h), shapy.editor.CamCube.SIZE);
};


/**
 * Updates the matrices.
 */
shapy.editor.CamCube.prototype.compute = function() {
  var size = shapy.editor.CamCube.DISTANCE * 0.5;

  // Compute the camera position based on the tracked camera.
  goog.vec.Vec3.subtract(this.camera_.eye, this.camera_.center, this.pos_);
  goog.vec.Vec3.normalize(this.pos_, this.pos_);
  goog.vec.Vec3.scale(this.pos_, shapy.editor.CamCube.DISTANCE, this.pos_);

  // Compute cube projection matrix based on the camera's mode.
  if (this.viewport_.type == shapy.editor.Viewport.Type.PERSPECTIVE) {
    goog.vec.Mat4.makePerspective(this.proj, 45.0, 1.0, 0.1, 100);
  } else {
    goog.vec.Mat4.makeOrtho(this.proj, -size, size, -size, size, 0.1, 100);
  }

  // Compute view and vp matrices.
  goog.vec.Mat4.makeLookAt(this.view, this.pos_, [0, 0, 0], this.camera_.up);
  goog.vec.Mat4.multMat(this.proj, this.view, this.vp);
};
