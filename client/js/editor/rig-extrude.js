// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig.Extrude');

goog.require('shapy.editor.Rig');

/**
 * Rig used for cutting.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Extrude = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.EXTRUDE);
};
goog.inherits(shapy.editor.Rig.Extrude, shapy.editor.Rig);


/**
 * Builds the line mesh
 *
 * @private
 *
 * @param {!WebGLContext}   gl WebGL context.
 */
shapy.editor.Rig.Extrude.prototype.build_ = function(gl) {
  // Construct the line along the X axis
  var d = new Float32Array(6);
  var k = 0;
  d[k++] = 0.0; d[k++] = 0.0; d[k++] = -1000.0;
  d[k++] = 0.0; d[k++] = 0.0; d[k++] = 1000.0;

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Builds the model matrix. A precondition here is that the normal matrix is
 * normalised.
 *
 * @param {!goog.vec.Vec3.Type} centre
 * @param {!goog.vec.Vec3.Type} normal
 */
shapy.editor.Rig.Extrude.prototype.buildModelMatrix = function(centre, normal) {
  var inclination = Math.asin(-normal[1]);
  var azimuth = Math.atan2(normal[0], normal[2]);

  // As we're using euler angles, apply rotation in a ZYX order
  goog.vec.Mat4.makeTranslate(this.model_, centre[0], centre[1], centre[2]);
  goog.vec.Mat4.rotateY(this.model_, azimuth, this.model_);
  goog.vec.Mat4.rotateX(this.model_, inclination, this.model_);
};


/**
 * Renders the cut rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Extrude.prototype.render = function(gl, sh) {
  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  sh.uniformMat4x4('u_model', this.model_);
  sh.uniform4f('u_colour', 1.0, 0.0, 0.0, 1.0);
  gl.drawArrays(goog.webgl.LINES, 0, 2);

  gl.disableVertexAttribArray(0);
};


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Extrude.prototype.mouseMove = function(ray) {
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Extrude.prototype.mouseDown = function(ray) {
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Extrude.prototype.mouseUp = function(ray) {
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Extrude.prototype.mouseLeave = function() {
};
