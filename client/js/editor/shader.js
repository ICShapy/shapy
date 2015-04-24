// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Shader');

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
};


/**
 * Compiles a shader source.
 */
shapy.editor.Shader.prototype.compile = function(type, source) {
  var prog = this.gl_.createShader(type);
};


/**
 * Links the whole shader.
 */
shapy.editor.Shader.prototype.link = function() {

};
