// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Renderer');

goog.require('goog.webgl');
goog.require('shapy.editor.Object');
goog.require('shapy.editor.Shader');



/** @private {string} @const */
shapy.editor.COLOUR_VS =
  'uniform mat4 u_mvp;                      \n' +
  'void main() {                            \n' +
  '  gl_Position = u_mvp * vec4(0, 0, 0, 1);\n' +
  '}                                        \n';


/** @private {string} @const */
shapy.editor.COLOUR_FS =
  'void main() {' +
  '}';



/**
 * Creates a new renderer.
 *
 * @private {!WebGLContext} gl WebGL context.
 *
 * @constructor
 */
shapy.editor.Renderer = function(gl) {
  /** @private {!WebGLContext} @const */
  this.gl_ = gl;

  /** @private {!shapy.editor.Shader} @const */
  this.shColour = new shapy.editor.Shader(this.gl_);
  this.shColour.compile(goog.webgl.VERTEX_SHADER, shapy.editor.COLOUR_VS);
  this.shColour.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.COLOUR_FS);
  this.shColour.link();
};
