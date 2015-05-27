// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig.Translate');

goog.require('shapy.editor.geom');
goog.require('shapy.editor.Rig');



/**
 * Rig used to alter position / translate objects.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Translate = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.TRANSLATE);

  /**
   * @private {goog.vec.Vec3.Type}
   */
  this.lastPos_ = goog.vec.Vec3.createFloat32();
};
goog.inherits(shapy.editor.Rig.Translate, shapy.editor.Rig);


/**
 * Number of points used for the base of the arrowhead.
 * @type {number} @const
 */
shapy.editor.Rig.Translate.CIRCLE = 16;


/**
 * Creates the mesh for the rig.
 *
 * @private
 *
 * @param {!WebGLContext}        gl WebGL context.
 */
shapy.editor.Rig.Translate.prototype.build_ = function(gl) {
  // Construct the arrows.
  var d = new Float32Array(shapy.editor.Rig.Translate.CIRCLE * 36 + 108 + 6);
  var angle = 2 * Math.PI / shapy.editor.Rig.Translate.CIRCLE;
  var k = 0;

  // Construct the tube.
  this.buildTube_(
      d, k, shapy.editor.Rig.Translate.CIRCLE, 1.0, 0.02, [0.0, 0.0, 0.0]);
  k += shapy.editor.Rig.Translate.CIRCLE * 18;

  // Construct the arrowhead.
  for (var i = 0; i < shapy.editor.Rig.Translate.CIRCLE; i++) {
    var py = 0.05 * Math.sin(i * angle);
    var pz = 0.05 * Math.cos(i * angle);
    var cy = 0.05 * Math.sin((i + 1) * angle);
    var cz = 0.05 * Math.cos((i + 1) * angle);

    d[k++] = 1.000; d[k++] = py;  d[k++] = pz;
    d[k++] = 1.000; d[k++] = 0.0; d[k++] = 0.0;
    d[k++] = 1.000; d[k++] = cy;  d[k++] = cz;

    d[k++] = 1.125; d[k++] = 0.0; d[k++] = 0.0;
    d[k++] = 1.000; d[k++] = py;  d[k++] = pz;
    d[k++] = 1.000; d[k++] = cy;  d[k++] = cz;
  }

  // Construct a cube on the origin.
  this.buildCube_(d, k, 0.05);
  k += 108;

  // Line through the arrow.
  d[k++] = -1000.0; d[k++] = 0.0; d[k++] = 0.0;
  d[k++] =  1000.0; d[k++] = 0.0; d[k++] = 0.0;

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Translate.prototype.render = function(gl, sh) {
  var pos = this.object.getPosition();

  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  // Arrow on X.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.x) {
    sh.uniform4f('u_colour', 1.0, 0.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.7, 0.0, 0.0, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Translate.CIRCLE * 12);

  // Line on X.
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 0.271, 0.0, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Translate.CIRCLE * 12 + 36, 2);
  }

  // Arrow on Y.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.rotateZ(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.y) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.y) {
    sh.uniform4f('u_colour', 0.2, 0.5, 1.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.0, 0.7, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Translate.CIRCLE * 12);

  // Line on Y.
  if (this.select_.y) {
    sh.uniform4f('u_colour', 0.255, 0.412, 0.882, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Translate.CIRCLE * 12 + 36, 2);
  }

  // Arrow on Z.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.rotateY(this.model_, -Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.z) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.z) {
    sh.uniform4f('u_colour', 0.0, 1.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.7, 0.0, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Translate.CIRCLE * 12);

  // Line on Z.
  if (this.select_.z) {
    sh.uniform4f('u_colour', 0.196, 0.804, 0.196, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Translate.CIRCLE * 12 + 36, 2);
  }

  // Box on the origin.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  sh.uniformMat4x4('u_model', this.model_);
  sh.uniform4f('u_colour', 1, 1, 0, 1);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Translate.CIRCLE * 12, 36);

  gl.disableVertexAttribArray(0);
};


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Translate.prototype.mouseMove = function(ray) {
  var pos = this.object.getPosition();

  if (this.select_.x || this.select_.y || this.select_.z) {
    // Calculate the translation.
    var t = goog.vec.Vec3.createFloat32();
    var currPos = this.getClosest_(ray);
    goog.vec.Vec3.subtract(currPos, this.lastPos_, t);
    this.lastPos_ = currPos;

    // Update the position.
    this.object.translate(
        pos[0] + t[0], pos[1] + t[1], pos[2] + t[2]);
    return;
  }

  var c = goog.vec.Vec3.createFloat32();

  // Find intersection with X arrow.
  goog.vec.Vec3.setFromValues(c, pos[0] + 1.1, pos[1], pos[2]);
  this.hover_.x = shapy.editor.geom.intersectSphere(ray, c, 0.1);

  // Find intersection with Y arrow.
  goog.vec.Vec3.setFromValues(c, pos[0], pos[1] + 1.1, pos[2]);
  this.hover_.y = shapy.editor.geom.intersectSphere(ray, c, 0.1);

  // Find intersection with Z arrow.
  goog.vec.Vec3.setFromValues(c, pos[0], pos[1], pos[2] + 1.1);
  this.hover_.z = shapy.editor.geom.intersectSphere(ray, c, 0.1);
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Translate.prototype.mouseDown = function(ray) {
  this.select_.x = this.hover_.x;
  this.select_.y = this.hover_.y;
  this.select_.z = this.hover_.z;
  this.lastPos_ = this.getClosest_(ray);
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 *
 * @return {boolean} True if event was captured.
 */
shapy.editor.Rig.Translate.prototype.mouseUp = function(ray) {
  var captured = this.select_.x || this.select_.x || this.select_.z;
  this.select_.x = this.select_.y = this.select_.z = false;
  if (this.onFinish) {
    var pos = this.object.getPosition();
    this.onFinish(this.object, pos[0], pos[1], pos[2]);
  }
  return captured;
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Translate.prototype.mouseLeave = function() {
  this.select_.x = this.select_.y = this.select_.z = false;
};
