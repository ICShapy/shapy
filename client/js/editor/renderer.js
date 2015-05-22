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
  'attribute vec4 a_colour;                         \n' +
  'attribute vec3 a_bary;                           \n' +

  'uniform mat4 u_view;                             \n' +
  'uniform mat4 u_proj;                             \n' +
  'uniform mat4 u_vp;                               \n' +

  'varying vec3 v_bary;                             \n' +
  'varying vec4 v_colour;                           \n' +

  'void main() {                                    \n' +
  '  v_bary = a_bary;                               \n' +
  '  v_colour = a_colour;                           \n' +
  '  gl_Position = u_vp * vec4(a_vertex, 1);        \n' +
  '}                                                \n';


/** @private {string} @const */
shapy.editor.OBJECT_FS =
  '#extension GL_OES_standard_derivatives : enable                    \n' +

  'precision mediump float;                                           \n' +

  'uniform vec4 u_border;                                             \n' +
  'varying vec4 v_colour;                                             \n' +
  'varying vec3 v_bary;                                               \n' +

  'void main() {                                                      \n' +
  // The border's alpha determines its intensity.
  '  vec3 a3 = smoothstep(vec3(0.0), fwidth(v_bary) * 0.25, v_bary);  \n' +
  '  float e = min(min(a3.x, a3.y), a3.z);                            \n' +
  '  vec4 border = u_border;                                          \n' +
  '  if (any(lessThan(v_bary, vec3(0.03)))) {                         \n' +
  '    border.a *= e;                                                 \n' +
  '  } else {                                                         \n' +
  '    border.a = 0.0;                                                \n' +
  '  }                                                                \n' +

  // The final colour is lerped diffuse + border.
  '  vec3 colour = mix(v_colour.rgb, border.rgb, border.a);           \n' +
  '  gl_FragColor = vec4(colour.rgb, v_colour.a);                     \n' +
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

  this.msCube_ = shapy.editor.Mesh.createCube(gl, 1, 1, 1);

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
shapy.editor.Renderer.prototype.renderScene = function(vp) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  vp.camera.compute();
  this.shColour_.use();
  this.shColour_.uniform4fv('u_view', vp.camera.view);
  this.shColour_.uniform4fv('u_proj', vp.camera.proj);
  this.shColour_.uniform4fv('u_vp', vp.camera.vp);

  this.msGround_.render(this.shColour_);
}

/**
 * Renders the overlay
 */
shapy.editor.Renderer.prototype.renderOverlay = function(vp) {
  // Disable depth
  this.gl_.disable(goog.webgl.DEPTH_TEST);

  // The viewport of the cube is always rectangular in the top corner
  var cubeVPSize = (vp.rect.w < vp.rect.h ? vp.rect.w : vp.rect.h) / 4;
  this.gl_.viewport(
      vp.rect.x, vp.rect.y + vp.rect.h - cubeVPSize, cubeVPSize, cubeVPSize);
  this.gl_.scissor(
      vp.rect.x, vp.rect.y + vp.rect.h - cubeVPSize, cubeVPSize, cubeVPSize);

  // Compute the cube camera matrices
  vp.cubeCamera.compute();
  this.shColour_.uniform4fv('u_view', vp.cubeCamera.view);
  this.shColour_.uniform4fv('u_proj', vp.cubeCamera.proj);
  this.shColour_.uniform4fv('u_vp', vp.cubeCamera.vp);
  this.msCube_.render(this.shColour_);

  // Enable depth
  this.gl_.enable(goog.webgl.DEPTH_TEST);
};
