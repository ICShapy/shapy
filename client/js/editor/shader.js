// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Shader');

goog.require('goog.object');
goog.require('goog.webgl');



/**
 * Generic shader class.
 *
 * @param {!WebGLContext} gl WebGL context.
 *
 * @constructor
 */
shapy.editor.Shader = function(gl) {
  /** @private {!WebGLContext} @const */
  this.gl_ = gl;
  /** @private {!WebGLProgram} @const */
  this.prog_ = this.gl_.createProgram();
  /** @private {!Object<string, WebGLUniformLocation>} @const */
  this.unifs_ = {};
};


/**
 * Compiles a shader source.
 */
shapy.editor.Shader.prototype.compile = function(type, source) {
  var shader;

  shader = this.gl_.createShader(type);
  this.gl_.shaderSource(shader, source);
  this.gl_.compileShader(shader);
  if (!this.gl_.getShaderParameter(shader, goog.webgl.COMPILE_STATUS)) {
    throw new Error(this.gl_.getShaderInfoLog(shader));
  }
  this.gl_.attachShader(this.prog_, shader);
};


/**
 * Links the whole shader.
 */
shapy.editor.Shader.prototype.link = function() {
  var count, unif;

  // Bind attribute locations.
  this.gl_.bindAttribLocation(this.prog_, 0, "a_vertex");
  this.gl_.bindAttribLocation(this.prog_, 1, "a_normal");
  this.gl_.bindAttribLocation(this.prog_, 2, "a_uv");
  this.gl_.bindAttribLocation(this.prog_, 3, "a_colour");
  this.gl_.bindAttribLocation(this.prog_, 4, "a_bary");

  // Link the shader.
  this.gl_.linkProgram(this.prog_);
  if (!this.gl_.getProgramParameter(this.prog_, goog.webgl.LINK_STATUS)) {
    throw new Error(this.gl_.getProgramInfoLog(this.prog_));
  }

  // Retrieve information about the uniforms.
  count = this.gl_.getProgramParameter(this.prog_, goog.webgl.ACTIVE_UNIFORMS);
  for (var i = 0; i < count; ++i) {
    unif = this.gl_.getActiveUniform(this.prog_, i);
    this.unifs_[unif.name] = this.gl_.getUniformLocation(this.prog_, unif.name);
  }
};


/**
 * Binds the shader to the context.
 */
shapy.editor.Shader.prototype.use = function() {
  this.gl_.useProgram(this.prog_);
};


/**
 * Sets the value of a uniform matrix.
 *
 * @param {string}       name  Name of the uniform matrix.
 * @param {Float32Array} value Value of the matrix.
 */
shapy.editor.Shader.prototype.uniform4fv = function(name, value) {
  if (!goog.object.containsKey(this.unifs_, name)) {
    return;
  }
  this.gl_.uniformMatrix4fv(this.unifs_[name], false, value);
};


/**
 * Sets the value of a uniform 3D vector.
 *
 * @param {string}       name  Name of the vector.
 * @param {Float32Array} value Value of the vector.
 */
shapy.editor.Shader.prototype.uniform3f = function(name, value) {
  if (!goog.object.containsKey(this.unifs_, name)) {
    return;
  }
  this.gl_.uniform3fv(this.unifs_[name], value);
};


/**
 * Sets the value of a uniform 2D vector.
 *
 * @param {string} name  Name of the vector.
 * @param {number} x     First vector component.
 * @param {number} y     Second vector component.
 */
shapy.editor.Shader.prototype.uniform2f = function(name, x, y) {
  if (!goog.object.containsKey(this.unifs_, name)) {
    return;
  }
  this.gl_.uniform2f(this.unifs_[name], x, y);
};



/**
 * Sets the value of a uniform 3D vector.
 *
 * @param {string}       name  Name of the vector.
 * @param {Float32Array} value Value of the vector.
 */
shapy.editor.Shader.prototype.uniform3f = function(name, value) {
  if (!goog.object.containsKey(this.unifs_, name)) {
    return;
  }
  this.gl_.uniform3fv(this.unifs_[name], value);
};


/**
 * Sets the value of a uniform 4D vector.
 *
 * @param {string}       name  Name of the vector.
 * @param {Float32Array} value Value of the vector.
 */
shapy.editor.Shader.prototype.uniform4f = function(name, value) {
  if (!goog.object.containsKey(this.unifs_, name)) {
    return;
  }
  this.gl_.uniform4fv(this.unifs_[name], value);
};
