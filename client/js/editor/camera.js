// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Camera');
goog.provide('shapy.editor.Camera.Ortho');
goog.provide('shapy.editor.Camera.Persp');



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
 * Resize the camera, usually affects aspect ratio of perspective cameras.
 */
shapy.editor.Camera.prototype.resize = goog.abstractMethod;


/**
 * Perspective camera.
 *
 * @constructor
 * @extends {shapy.editor.Camera}
 */
shapy.editor.Camera.Persp = function() {
  shapy.editor.Camera.call(this);
};
goog.inherits(shapy.editor.Camera.Persp, shapy.editor.Camera);


/**
 *
 */
shapy.editor.Camera.Persp.prototype.resize = function(w, h) {

};



/**
 * Ortho camera.
 *
 * @constructor
 * @extends {shapy.editor.Camera}
 */
shapy.editor.Camera.Ortho = function() {
  shapy.editor.Camera.call(this);
};
goog.inherits(shapy.editor.Camera.Ortho, shapy.editor.Camera);


/**
 *
 */
shapy.editor.Camera.Ortho.prototype.resize = function(w, h) {

};
