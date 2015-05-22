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
shapy.editor.OVERLAY_VS =
  'precision highp float;                                             \n' +

  'attribute vec2 a_vertex;                                           \n' +
  'uniform vec2 u_size;                                               \n' +
  'void main() {                                                      \n' +
  '  gl_Position = vec4(a_vertex * (1.0 - 0.5 / u_size), 0.0, 1.0);   \n' +
  '}                                                                  \n';


/** @type {string} @const */
shapy.editor.OVERLAY_FS =
  'precision highp float;                                             \n' +

  'uniform vec4 u_colour;                                             \n' +

  'void main() {                                                      \n' +
  '  gl_FragColor = u_colour;                                         \n' +
  '}                                                                  \n';



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
  this.shOverlay_ = new shapy.editor.Shader(this.gl_);
  this.shOverlay_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.OVERLAY_VS);
  this.shOverlay_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.OVERLAY_FS);
  this.shOverlay_.link();

  /** @private {!shapy.editor.Mesh} @const */
  this.msGround_ = shapy.editor.Mesh.createGroundPlane(gl, 20, 20);
  this.msCube_ = shapy.editor.Mesh.createCube(gl, 1, 1, 1);

  this.identity = goog.vec.Mat4.createFloat32Identity();
  this.cubeCameraEye_ = goog.vec.Vec3.createFloat32();
  this.cubeView_ = goog.vec.Mat4.createFloat32();
  this.cubeProj_ = goog.vec.Mat4.createFloat32();
  this.cubeVP_ = goog.vec.Mat4.createFloat32();

  /** @private {!WebGLBuffer} @const */
  this.overlay_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.overlay_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, 1, 1, -1, 1
  ]), goog.webgl.STATIC_DRAW);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, null);
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
 *
 * @param {!shapy.editor.Viewport} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderScene = function(vp) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  // Renders the scene.
  {
    vp.camera.compute();
    this.shColour_.use();
    this.shColour_.uniform4fv('u_view', vp.camera.view);
    this.shColour_.uniform4fv('u_proj', vp.camera.proj);
    this.shColour_.uniform4fv('u_vp', vp.camera.vp);
    this.msGround_.render(this.shColour_);
  }

  // Render the border.
  this.gl_.lineWidth(1.0);
  this.gl_.disable(goog.webgl.DEPTH_TEST);
  {
    this.shOverlay_.use();
    if (vp.active) {
      this.shOverlay_.uniform4f('u_colour', new Float32Array([1, 1, 0, 1]));
    } else {
      this.shOverlay_.uniform4f('u_colour', new Float32Array([.1, .1, .1, 1]));
    }
    this.shOverlay_.uniform2f(
        'u_size', new Float32Array([vp.rect.w, vp.rect.h]));
    this.shOverlay_.uniform4fv('u_view', this.identity);
    this.shOverlay_.uniform4fv('u_proj', this.identity);
    this.shOverlay_.uniform4fv('u_vp', this.identity);

    this.gl_.enableVertexAttribArray(0);
    this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.overlay_);
    this.gl_.vertexAttribPointer(0, 2, goog.webgl.FLOAT, false, 8, 0);
    this.gl_.drawArrays(goog.webgl.LINE_LOOP, 0, 4);
    this.gl_.disableVertexAttribArray(0);
  }
  this.gl_.enable(goog.webgl.DEPTH_TEST);
}

/**
 * Renders the overlay
 *
 * @param {!shapy.editor.Viewport} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderOverlay = function(vp) {
  this.gl_.disable(goog.webgl.DEPTH_TEST);

  // The viewport of the cube is always rectangular in the top corner.
  var min = function(x, y) { return x < y ? x : y; };
  var cubeVPBaseSize = 120;
  var cubeVPSize = min(min(vp.rect.w / 3, vp.rect.h), cubeVPBaseSize);
  this.gl_.viewport(
      vp.rect.x, vp.rect.y + vp.rect.h - cubeVPSize, cubeVPSize, cubeVPSize);
  this.gl_.scissor(
      vp.rect.x, vp.rect.y + vp.rect.h - cubeVPSize, cubeVPSize, cubeVPSize);

  // Set the eye vec of the cube view matrix to be the offset of the camera from
  // it's center, multipled by the distance.
  var distance = 5;
  goog.vec.Vec3.direction(vp.camera.eye, vp.camera.center, this.cubeCameraEye_);
  goog.vec.Vec3.scale(this.cubeCameraEye_, -distance, this.cubeCameraEye_);

  // Compute cube projection matrix based on the cameras mode.
  if (vp.type == shapy.editor.Viewport.Type.PERSPECTIVE) {
    goog.vec.Mat4.makePerspective(this.cubeProj_, 45.0, 1.0, 0.1, 100);
  } else {
    var size = distance * 0.5;
    goog.vec.Mat4.makeOrtho(this.cubeProj_, -size, size, -size, size, 0.1, 100);
  }

  // Compute view and vp matrices.
  goog.vec.Mat4.makeLookAt(
      this.cubeView_, this.cubeCameraEye_, vp.camera.center, vp.camera.up);
  goog.vec.Mat4.multMat(this.cubeProj_, this.cubeView_, this.cubeVP_);

  // Render cube.
  this.shColour_.use();
  this.shColour_.uniform4fv('u_view', this.cubeView_);
  this.shColour_.uniform4fv('u_proj', this.cubeProj_);
  this.shColour_.uniform4fv('u_vp', this.cubeVP_);
  this.msCube_.render(this.shColour_);

  this.gl_.enable(goog.webgl.DEPTH_TEST);
};
