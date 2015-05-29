// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig.Cut');

goog.require('shapy.editor.Rig');

/**
 * Rig used for cutting.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Cut = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.CUT);

  /**
   * @private {goog.vec.Vec3.Type}
   */
  this.startPoint_ = goog.vec.Vec3.createFloat32();

  /**
   * @private {goog.vec.Vec3.Type}
   */
  this.endPoint_ = goog.vec.Vec3.createFloat32();
};
goog.inherits(shapy.editor.Rig.Cut, shapy.editor.Rig);


/**
 * Renders the cut rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Cut.prototype.render = fucntion(gl, sh) {

};


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseMove = function(ray) {

};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Cut.prototype.mouseDown = function(ray) {

};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Cut.prototype.mouseUp = function(ray) {

};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Cut.mouseLeave = function() {

};