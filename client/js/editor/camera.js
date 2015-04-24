// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Camera');



/**
 * Camera class.
 *
 * @constructor
 */
shapy.editor.Camera = function() {
  /** @private {!goog.vec.Mat4} @const */
  this.proj_ = goog.vec.Mat4.createFloat32();
  /** @private {!goog.vec.Mat4} @const */
  this.view_ = goog.vec.Mat4.createFloat32();
  /** @private {!goog.vec.Mat4} @const */
  this.vp_ = goog.vec.Mat4.createFloat32();
};


/**
 * Recomputes the matrices.
 */
shapy.editor.Camera.prototype.computeMatrices = goog.abstractMethod;



/**
 * Perspective camera.
 *
 * @constructor
 * @extends {shapy.editor.Camera}
 */
shapy.editor.PerspCamera = function() {

};
goog.inherits(shapy.editor.PerspCamera, shapy.editor.Camera);



/**
 * Ortho camera.
 *
 * @constructor
 * @extends {shapy.editor.Camera}
 */
shapy.editor.OrthoCamera = function() {

};
goog.inherits(shapy.editor.OrthoCamera, shapy.editor.Camera);
