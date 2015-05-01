// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Renderer');

goog.require('goog.webgl');
goog.require('shapy.editor.Object');
goog.require('shapy.editor.Shader');
goog.require('shapy.editor.Mesh');



/** @private {string} @const */
shapy.editor.OBJECT_VS =
  'attribute vec3 a_vertex;                         \n' +
  'attribute vec3 a_bary;                           \n' +
  'uniform mat4 u_view;                             \n' +
  'uniform mat4 u_proj;                             \n' +
  'uniform mat4 u_vp;                               \n' +
  'varying vec3 v_bary;                             \n' +
  'void main() {                                    \n' +
  '  v_bary = a_bary;                               \n' +
  '  gl_Position = u_vp * vec4(a_vertex, 1);        \n' +
  '}                                                \n';


/** @private {string} @const */
shapy.editor.OBJECT_FS =
  '#extension GL_OES_standard_derivatives : enable                    \n' +
  'precision mediump float;                                           \n' +
  'varying vec3 v_bary;                                               \n' +
  'void main() {                                                      \n' +
  '  vec3 a3 = smoothstep(vec3(0.0), fwidth(v_bary) * 1.5, v_bary);   \n' +
  '  float e = min(min(a3.x, a3.y), a3.z);                            \n' +
  '  if (any(lessThan(v_bary, vec3(0.02)))) {                         \n' +
  '    gl_FragColor = mix(vec4(vec3(1), 1.0), vec4(vec3(0.5), 1), e); \n' +
  '  } else {                                                         \n' +
  '    gl_FragColor = vec4(0.5, 0.5, 0.5, 1);                         \n' +
  '  }                                                                \n' +
  '}                                                                  \n';


/** @private {string} @const */
shapy.editor.GROUND_VS =
  '';


/** @private {string} @const */
shapy.editor.GROUND_FS =
  '';


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
  this.shColour_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.OBJECT_VS);
  this.shColour_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.OBJECT_FS);
  this.shColour_.link();

  /** @private {!shapy.editor.Mesh} @const */
  this.msGround_ = shapy.editor.Mesh.createGroundPlane(gl, 20, 20);

  this.buffer_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
      -0.5, 0.0, -0.5, 0.0, 1.0, 0.0, 0.0, 0.0,
       0.5, 0.0, -0.5, 0.0, 1.0, 0.0, 1.0, 0.0,
      -0.5, 0.0,  0.5, 0.0, 1.0, 0.0, 0.0, 1.0,

      -0.5, 0.0,  0.5, 0.0, 1.0, 0.0, 0.0, 1.0,
       0.5, 0.0, -0.5, 0.0, 1.0, 0.0, 1.0, 0.0,
       0.5, 0.0,  0.5, 0.0, 1.0, 0.0, 1.0, 1.0,
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
  this.shColour_.uniform4fv('u_view', vp.camera.view);
  this.shColour_.uniform4fv('u_proj', vp.camera.proj);
  this.shColour_.uniform4fv('u_vp', vp.camera.vp);

  //this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  //this.gl_.enableVertexAttribArray(0);
  //this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 32, 0);
  //this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, 6);
  //this.gl_.disableVertexAttribArray(0);

  this.msGround_.render(this.shColour_);
};
