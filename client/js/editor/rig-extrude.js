// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig.Extrude');

goog.require('shapy.editor.PartsGroup');
goog.require('shapy.editor.Rig');

/**
 * Rig used for cutting.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Extrude = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.EXTRUDE);

  /** @private {!goog.vec.Vec3.Type} */
  this.normal_ = null;

  /** @private {!goog.vec.Vec3.Type} */
  this.startPos_ = goog.vec.Vec3.createFloat32();

  /** @private {boolean} */
  this.isExtruding_ = false;
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
 * Sets up the rig using data returned from the extrude operation. A
 * precondition here is that the normal vector is normalised.
 *
 * @param {!goog.vec.Vec3.Type} normal
 */
shapy.editor.Rig.Extrude.prototype.setup = function(normal) {
  this.normal_ = normal;
  this.isExtruding_ = true;

  // Set up the model matrix
  // As we're using euler angles, apply rotation in a ZYX order
  var inclination = Math.asin(-this.normal_[1]);
  var azimuth = Math.atan2(this.normal_[0], this.normal_[2]);
  var centre = this.object.getPosition();

  goog.vec.Vec3.setFromArray(this.startPos_, centre);
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
  if (!this.isExtruding_) {
    return;
  }

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
  if (!this.isExtruding_) {
    return;
  }

  var targetPos = shapy.editor.geom.getClosest(
      new goog.vec.Ray(this.object.getPosition(), this.normal_), ray).p0;
  var delta = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.subtract(targetPos, this.object.getPosition(), delta);
  this.object.translate(delta[0], delta[1], delta[2]);
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Extrude.prototype.mouseDown = function(ray) {
  //console.log("down");
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Extrude.prototype.mouseUp = function(ray) {
  var captured = this.isExtruding_;
  this.finish_(captured);
  this.isExtruding_ = false;
  return captured;
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Extrude.prototype.mouseLeave = function() {
  this.finish_(this.isExtruding_);
  this.isExtruding_ = false;
};


/**
 * Handles onFinish call.
 *
 * @param {boolean} captured
 */
shapy.editor.Rig.Extrude.prototype.finish_ = function(captured) {
  if (this.onFinish && captured) {
    var pos = this.object.getPosition();
    this.onFinish(
        this.object,
        pos[0] - this.startPos_[0],
        pos[1] - this.startPos_[1],
        pos[2] - this.startPos_[2]
    );
  }
};
