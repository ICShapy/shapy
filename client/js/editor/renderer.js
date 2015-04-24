// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Renderer');

goog.require('goog.webgl');
goog.require('shapy.editor.Object');
goog.require('shapy.editor.Shader');



/** @private {string} @const */
shapy.editor.COLOUR_VS =
  'attribute vec3 in_vertex;                \n' +
  'uniform mat4 u_mvp;                      \n' +
  'void main() {                            \n' +
  '  gl_Position = vec4(in_vertex, 1);      \n' +
  '}                                        \n';


/** @private {string} @const */
shapy.editor.COLOUR_FS =
  'void main() {                            \n' +
  '  gl_FragColor = vec4(0, 1, 0, 1);       \n' +
  '}                                        \n';



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
  this.shColour_ = new shapy.editor.Shader(this.gl_);
  this.shColour_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.COLOUR_VS);
  this.shColour_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.COLOUR_FS);
  this.shColour_.link();


  this.buffer_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0,
       0.5, -0.5, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0,
      -0.5,  0.5, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,

      -0.5,  0.5, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
       0.5, -0.5, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0,
       0.5,  0.5, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,
  ]), goog.webgl.STATIC_DRAW);
};


/**
 * Start rendering a scene.
 */
shapy.editor.Renderer.prototype.start = function() {
  this.gl_.clearColor(0.2, 0.2, 0.2, 1);
  this.gl_.clear(goog.webgl.COLOR_BUFFER_BIT | goog.webgl.DEPTH_BUFFER_BIT);
};


/**
 * Renders the scene.
 */
shapy.editor.Renderer.prototype.render = function(vp) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  this.shColour_.use();

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.enableVertexAttribArray(0);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 32, 0);
  this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, 6);
  this.gl_.disableVertexAttribArray(0);
};
