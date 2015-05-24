// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Renderer');

goog.require('goog.vec.Mat4');
goog.require('goog.webgl');
goog.require('shapy.editor.Mesh');
goog.require('shapy.editor.Object');
goog.require('shapy.editor.Shader');



/** @type {string} @const */
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


/** @type {string} @const */
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


/** @type {string} @const */
shapy.editor.BORDER_VS =
  'attribute vec2 a_vertex;                                           \n' +
  'uniform vec2 u_size;                                               \n' +
  'void main() {                                                      \n' +
  '  gl_Position = vec4(a_vertex * (1.0 - 0.5 / u_size), 0.0, 1.0);   \n' +
  '}                                                                  \n';


/** @type {string} @const */
shapy.editor.BORDER_FS =
  'precision mediump float;                                           \n' +
  'uniform vec4 u_colour;                                             \n' +
  'void main() {                                                      \n' +
  '  gl_FragColor = u_colour;                                         \n' +
  '}                                                                  \n';


/** @type {string} @const */
shapy.editor.GROUND_VS =
  'attribute vec3 a_vertex;                                           \n' +
  'uniform mat4 u_vp;\n' +
  'uniform vec2 u_size;\n' +
  'varying vec3 v_vertex;\n' +

  'void main() {                                                      \n' +
  '  vec3 vertex = a_vertex * vec3(u_size.x, 0, u_size.y);\n' +
  '  v_vertex = vertex;\n' +
  '  gl_Position = u_vp * vec4(vertex, 1.0);\n' +
  '}                                                                  \n';


/** @type {string} @const */
shapy.editor.GROUND_FS =
  '#extension GL_OES_standard_derivatives : enable                         \n' +

  'precision mediump float;                                             \n' +

  'varying vec3 v_vertex;\n' +

  'float alpha(float d, float w) {\n' +
  '  return max(smoothstep(w - fwidth(d), w + fwidth(d), d), 0.0);\n' +
  '}\n' +

  'void main() {                                                      \n' +
  '  float ax = alpha(distance(v_vertex.x, 0.0), 0.05);\n' +
  '  float az = alpha(distance(v_vertex.z, 0.0), 0.05);\n' +

  '  vec2 a1 = fract(v_vertex.xz);\n' +
  '  a1 = min(a1, 1.0 - a1);\n' +
  '  float a1x = alpha(a1.x, 0.01);\n' +
  '  float a1z = alpha(a1.y, 0.01);\n' +

  '  vec2 a5 = fract(v_vertex.xz / 5.0);\n' +
  '  a5 = min(a5, 1.0 - a5) * 5.0;\n' +
  '  float a5x = alpha(a5.x, 0.02);\n' +
  '  float a5z = alpha(a5.y, 0.02);\n' +

  '  vec4 colour = vec4(0.2, 0.2, 0.2, 0.5);\n' +
  '  colour = mix(vec4(0.2, 0.5, 1.0, 1.0), colour, a1x);\n' +
  '  colour = mix(vec4(0.2, 0.5, 1.0, 1.0), colour, a1z);\n' +
  '  colour = mix(vec4(0.5, 0.5, 1.0, 1.0), colour, a5x);\n' +
  '  colour = mix(vec4(0.5, 0.5, 1.0, 1.0), colour, a5z);\n' +
  '  colour = mix(vec4(1.0, 0.0, 0.0, 1.0), colour, ax);\n' +
  '  colour = mix(vec4(0.0, 1.0, 0.0, 1.0), colour, az);\n' +
  '  gl_FragColor = colour;\n' +
  '}\n';



/**
 * Creates a new renderer.
 *
 * @constructor
 *
 * @param {!WebGLContext} gl WebGL context.
 */
shapy.editor.Renderer = function(gl) {
  /** @private {!WebGLContext} @const */
  this.gl_ = gl;


  /** @private {!shapy.editor.Shader} @const */
  this.shColour_ = new shapy.editor.Shader(this.gl_);
  this.shColour_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.OBJECT_VS);
  this.shColour_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.OBJECT_FS);
  this.shColour_.link();

  /** @private {!shapy.editor.Shader} @const */
  this.shBorder_ = new shapy.editor.Shader(this.gl_);
  this.shBorder_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.BORDER_VS);
  this.shBorder_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.BORDER_FS);
  this.shBorder_.link();

  /** @private {!shapy.editor.Shader} @const */
  this.shGround_ = new shapy.editor.Shader(this.gl_);
  this.shGround_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.GROUND_VS);
  this.shGround_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.GROUND_FS);
  this.shGround_.link();

  /** @private {!shapy.editor.Mesh} @const */
  this.msCube_ = shapy.editor.Mesh.createCube(gl, 1, 1, 1);

  /** @private {!WebGLBuffer} @const */
  this.bfRect_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfRect_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, 1, 1, -1, 1
  ]), goog.webgl.STATIC_DRAW);

  /** @private {!WebGLBuffer} @const */
  this.bfGround_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfGround_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
      -1, 0, -1, 1, 0, 1, -1, 0, 1,
      -1, 0, -1, 1, 0, 1, 1, 0, -1
  ]), goog.webgl.STATIC_DRAW);
};


/**
 * Start rendering a scene.
 */
shapy.editor.Renderer.prototype.start = function() {
  this.gl_.clearColor(0.95, 1, 1, 1);
  this.gl_.clear(goog.webgl.COLOR_BUFFER_BIT | goog.webgl.DEPTH_BUFFER_BIT);
};


/**
 * Renders the scene.
 *
 * @param {!shapy.editor.Viewport} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderGround = function(vp) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  // Renders the ground plane.
  this.gl_.enable(goog.webgl.BLEND);
  this.gl_.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);
  {
    this.shGround_.use();
    this.shGround_.uniform4fv('u_vp', vp.camera.vp);
    this.shGround_.uniform2f('u_size', 35, 35);

    this.gl_.enableVertexAttribArray(0);
    this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfGround_);
    this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);
    this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, 6);
    this.gl_.disableVertexAttribArray(0);
  }
  this.gl_.disable(goog.webgl.BLEND);
};


/**
 * Renders the border.
 *
 * @param {!shapy.editor.Viewport} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderBorder = function(vp) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  this.gl_.disable(goog.webgl.DEPTH_TEST);

  this.shBorder_.use();
  if (vp.active) {
    this.shBorder_.uniform4f('u_colour', new Float32Array([1, 1, 0, 1]));
  } else {
    this.shBorder_.uniform4f('u_colour', new Float32Array([.1, .1, .1, 1]));
  }
  this.shBorder_.uniform2f('u_size', vp.rect.w, vp.rect.h);

  this.gl_.enableVertexAttribArray(0);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfRect_);
  this.gl_.vertexAttribPointer(0, 2, goog.webgl.FLOAT, false, 8, 0);
  this.gl_.drawArrays(goog.webgl.LINE_LOOP, 0, 4);
  this.gl_.disableVertexAttribArray(0);

  this.gl_.enable(goog.webgl.DEPTH_TEST);
};


/**
 * Renders the BORDER
 *
 * @param {!shapy.editor.Viewport} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderCamCube = function(vp) {
  var size = vp.camCube.size;

  this.gl_.disable(goog.webgl.DEPTH_TEST);

  // The viewport of the cube is always rectangular in the top corner.
  this.gl_.viewport(vp.rect.x, vp.rect.y + vp.rect.h - size, size, size);
  this.gl_.scissor(vp.rect.x, vp.rect.y + vp.rect.h - size, size, size);

  // Render cube.
  this.shColour_.use();
  this.shColour_.uniform4fv('u_view', vp.camCube.view);
  this.shColour_.uniform4fv('u_proj', vp.camCube.proj);
  this.shColour_.uniform4fv('u_vp', vp.camCube.vp);
  this.msCube_.render(this.shColour_);

  this.gl_.enable(goog.webgl.DEPTH_TEST);
};
