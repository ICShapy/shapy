// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig.Scale');

goog.require('shapy.editor.geom');
goog.require('shapy.editor.Rig');



/**
 * Rig used to alter scaling.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Scale = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.SCALE);

  /**
   * @private {!goog.vec.Vec3.Type}
   */
  this.currPos_ = goog.vec.Vec3.createFloat32();

  /**
   * @private {!goog.vec.Vec3.Type}
   */
  this.lastPos_ = goog.vec.Vec3.createFloat32();

  /**
   * @private {!goog.vec.Vec3.Type}
   */
  this.startPos_ = goog.vec.Vec3.createFloat32();

  /**
   * @private {!goog.vec.Vec3.Type}
   */
  this.scale_ = goog.vec.Vec3.createFloat32FromValues(1.0, 1.0, 1.0);

  /** @pricate {!goog.vec.Vec3.Type} */
  this.startMid_ = goog.vec.Vec3.createFloat32();

  /**
   * @private {!goog.vec.Vec3.Type}
   * @const
   */
  this.noScale_ = goog.vec.Vec3.createFloat32FromValues(1.0, 1.0, 1.0);
};
goog.inherits(shapy.editor.Rig.Scale, shapy.editor.Rig);


/**
 * Number of points used for the base of the tube.
 * @type {number} @const
 */
shapy.editor.Rig.Scale.TUBE_BASE = 16;


/**
 * Creates the mesh for the rig.
 *
 * @private
 *
 * @param {!WebGLContext}        gl WebGL context.
 */
shapy.editor.Rig.Scale.prototype.build_ = function(gl) {
  var d = new Float32Array(shapy.editor.Rig.Scale.TUBE_BASE * 18 + 18 * 36 + 6);
  var k = 0;

  // Build the tube.
  this.buildTube_(
      d, k, shapy.editor.Rig.Scale.TUBE_BASE, 1.0, 0.015, [0.0, 0.0, 0.0]);
  k += shapy.editor.Rig.Scale.TUBE_BASE * 18;

  // Construct the cube on the tube.
  this.buildCube_(d, k, 0.07);
  k += 108;

  // Construct the cube on the origin.
  this.buildCube_(d, k, 0.05);
  k += 108;

  // Line through the rig.
  d[k++] = -1000.0; d[k++] = 0.0; d[k++] = 0.0;
  d[k++] =  1000.0; d[k++] = 0.0; d[k++] = 0.0;

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Handles onFinish call.
 *
 * @param {boolean} captured
 */
shapy.editor.Rig.Scale.prototype.finish_ = function(captured) {
  if (!this.onFinish || !captured) {
    return;
  }

  // Calculate the movement.
  var d = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.subtract(this.currPos_, this.startPos_, d);

  // Update the scale.
  goog.vec.Vec3.scale(d, 1 / this.size_, d);
  var sx = (this.noScale_[0] + d[0]) / this.noScale_[0];
  var sy = (this.noScale_[1] + d[1]) / this.noScale_[1];
  var sz = (this.noScale_[2] + d[2]) / this.noScale_[2];

  // Update the scale of the model to be the relative scale
  this.onFinish(this.object, sx, sy, sz, this.startMid_);
};


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Scale.prototype.render = function(gl, sh) {
  var pos = this.object.getPosition();

  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  // Tube on X.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, this.scale_[0], 1.0, 1.0);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.x) {
    sh.uniform4f('u_colour', 1.0, 0.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.7, 0.0, 0.0, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Scale.TUBE_BASE * 6);

  // Line on X.
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 0.271, 0.0, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Scale.TUBE_BASE * 6 + 72, 2);
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  }

  // Box on X.
  goog.vec.Mat4.makeTranslate(
      this.model_, pos[0] + this.scale_[0] * this.size_, pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  sh.uniformMat4x4('u_model', this.model_);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Scale.TUBE_BASE * 6 , 36);

  // Tube on Y.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, 1.0, this.scale_[1], 1.0);
  goog.vec.Mat4.rotateZ(this.model_, Math.PI / 2);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.y) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.y) {
    sh.uniform4f('u_colour', 0.2, 0.5, 1.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.0, 0.7, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Scale.TUBE_BASE * 6);

  // Line on Y.
  if (this.select_.y) {
    sh.uniform4f('u_colour', 0.255, 0.412, 0.882, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Scale.TUBE_BASE * 6 + 72, 2);
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  }

  // Box on Y.
  goog.vec.Mat4.makeTranslate(
      this.model_, pos[0], pos[1] + this.scale_[1] * this.size_, pos[2]);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  sh.uniformMat4x4('u_model', this.model_);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Scale.TUBE_BASE * 6 , 36);

  // Tube on Z.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, 1.0, 1.0, this.scale_[2]);
  goog.vec.Mat4.rotateY(this.model_, -Math.PI / 2);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.z) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.z) {
    sh.uniform4f('u_colour', 0.0, 1.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.7, 0.0, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Scale.TUBE_BASE * 6);

  // Line on Z.
  if (this.select_.z) {
    sh.uniform4f('u_colour', 0.196, 0.804, 0.196, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Scale.TUBE_BASE * 6 + 72, 2);
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  }

  // Box on Z.
  goog.vec.Mat4.makeTranslate(
      this.model_, pos[0], pos[1], pos[2] + this.scale_[2] * this.size_);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  sh.uniformMat4x4('u_model', this.model_);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Scale.TUBE_BASE * 6 , 36);

  // Box on the origin.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  sh.uniformMat4x4('u_model', this.model_);
  sh.uniform4f('u_colour', 1, 1, 0, 1);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Scale.TUBE_BASE * 6 + 36, 36);

  gl.disableVertexAttribArray(0);
};


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 *
 * @return {boolean}
 */
shapy.editor.Rig.Scale.prototype.mouseMove = function(ray) {
  if (this.select_.x || this.select_.y || this.select_.z) {
    // Calculate the movement.
    this.currPos_ = this.getClosest_(ray);
    var d = goog.vec.Vec3.createFloat32();

    goog.vec.Vec3.subtract(this.currPos_, this.lastPos_, d);
    goog.vec.Vec3.setFromArray(this.lastPos_, this.currPos_);

    // Update the scale.
    goog.vec.Vec3.scale(d, 1 / this.size_, d);
    var sx = (this.scale_[0] + d[0]) / this.scale_[0];
    var sy = (this.scale_[1] + d[1]) / this.scale_[1];
    var sz = (this.scale_[2] + d[2]) / this.scale_[2];
    goog.vec.Vec3.add(this.scale_, d, this.scale_);

    // Update the scale of the model to be the relative scale
    this.object.scale(sx, sy, sz);
    return true;
  }

  var pos = this.object.getPosition();
  var c = goog.vec.Vec3.createFloat32();

  // Intersection on X.
  goog.vec.Vec3.setFromValues(
    c, pos[0] + this.scale_[0] * this.size_, pos[1], pos[2]);
  this.hover_.x = shapy.editor.geom.intersectCube(ray, c, 0.1 * this.size_);

  // Intersection on Y.
  goog.vec.Vec3.setFromValues(
    c, pos[0], pos[1] + this.scale_[1] * this.size_, pos[2]);
  this.hover_.y = shapy.editor.geom.intersectCube(ray, c, 0.1 * this.size_);

  // Intersection on Z.
  goog.vec.Vec3.setFromValues(
    c, pos[0], pos[1], pos[2] + this.scale_[2] * this.size_);
  this.hover_.z = shapy.editor.geom.intersectCube(ray, c, 0.1 * this.size_);

  return this.hover_.x || this.hover_.y || this.hover_.z;
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 *
 * @return {boolean} True if event captured.
 */
shapy.editor.Rig.Scale.prototype.mouseDown = function(ray) {
  this.select_.x = this.hover_.x;
  this.select_.y = this.hover_.y;
  this.select_.z = this.hover_.z;

  this.currPos_ = this.getClosest_(ray);
  goog.vec.Vec3.setFromArray(this.lastPos_, this.currPos_);
  goog.vec.Vec3.setFromArray(this.startPos_, this.currPos_);
  goog.vec.Vec3.setFromArray(this.startMid_, this.object.getPosition());

  return this.hover_.x || this.hover_.y || this.hover_.z;
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Scale.prototype.mouseUp = function(ray) {
  var captured = this.select_.x || this.select_.y || this.select_.z;
  this.finish_(captured);

  // Reset select and scale.
  this.select_.x = this.select_.y = this.select_.z = false;
  goog.vec.Vec3.setFromArray(this.scale_, this.noScale_);

  return captured;
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Scale.prototype.mouseLeave = function() {
  this.finish_(this.select_.x || this.select_.y || this.select_.z);
  this.select_.x = this.select_.y = this.select_.z = false;

  // Reset the scale.
  goog.vec.Vec3.setFromArray(this.scale_, this.noScale_);
};
