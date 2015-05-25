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

  'uniform mat4 u_mvp;                              \n' +

  'varying vec3 v_bary;                             \n' +
  'varying vec4 v_colour;                           \n' +

  'void main() {                                    \n' +
  '  v_bary = a_bary;                               \n' +
  '  v_colour = a_colour;                           \n' +
  '  gl_Position = u_mvp * vec4(a_vertex, 1);       \n' +
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
shapy.editor.CUBE_VS =
  'attribute vec3 a_vertex;                                           \n' +
  'attribute vec2 a_uv;                                               \n' +
  'uniform mat4 u_vp;                                                 \n' +
  'varying vec2 v_uv;                                                 \n' +
  'void main() {                                                      \n' +
  '  v_uv = a_uv;                                                     \n' +
  '  gl_Position = u_vp * vec4(a_vertex, 1.0);                        \n' +
  '}                                                                  \n';


/** @type {string} @const */
shapy.editor.CUBE_FS =
  'precision mediump float;                                           \n' +
  'uniform sampler2D u_texture;                                       \n' +
  'uniform vec4 u_colour;                                             \n' +
  'varying vec2 v_uv;                                                 \n' +
  'void main() {                                                      \n' +
  '  gl_FragColor = u_colour * texture2D(u_texture, v_uv);            \n' +
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
  '  colour = mix(vec4(0.2, 0.5, 1.0, 0.95), colour, a1x);\n' +
  '  colour = mix(vec4(0.2, 0.5, 1.0, 0.95), colour, a1z);\n' +
  '  colour = mix(vec4(0.5, 0.5, 1.0, 0.95), colour, a5x);\n' +
  '  colour = mix(vec4(0.5, 0.5, 1.0, 0.95), colour, a5z);\n' +
  '  colour = mix(vec4(1.0, 0.0, 0.0, 0.95), colour, az);\n' +
  '  colour = mix(vec4(0.0, 1.0, 0.0, 0.95), colour, ax);\n' +
  '  gl_FragColor = colour;\n' +
  '}\n';


/** @type {string} @const */
shapy.editor.RIG_VS =
  'attribute vec3 a_vertex;\n' +
  'uniform mat4 u_vp;\n' +
  'uniform mat4 u_model;\n' +
  'void main(void) {\n' +
  '  gl_Position = u_vp * u_model * vec4(a_vertex, 1.0);\n' +
  '}\n';


/** @type {string} @const */
shapy.editor.RIG_FS =
  'precision mediump float;\n' +
  'uniform vec4 u_colour;\n' +
  'void main(void) {\n' +
  '  gl_FragColor = u_colour;\n' +
  '}\n';


/** @type {string} @const */
shapy.editor.CUBE_TEXTURE = 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAAYAAAABACAYAAAATWKC/AAAABmJLR0QA/wD/AP+gvaeTAAAA' +
    'CXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wUZEAEmHX2E8wAAABl0RVh0Q29tbWVudABD' +
    'cmVhdGVkIHdpdGggR0lNUFeBDhcAAALSSURBVHja7d1NkuogFAZQtNxV1p91dY+cWCb8CAHC' +
    'OVU96jwNF8IHMfZ7hBD+AgDLeYUQwr7vSzZ+27ag/dqv/dq/avufMhBgTQIAQAAAIAAAEAAA' +
    'CAAABAAAAgAAAQCAAABAAAAgAAAQAAAIAAAEAAACAAABAIAAAEAAACAAABAAAAgAAAQAAAIA' +
    'gBBCCC8lAMi3bdvh7/Z9T/53n8eevW7K61cNgNjJvE+kVTHex8ReY9/3ZoUrbVvKuZ+9x7eB' +
    'kVKHXoP86P1n6ONf6pMyBlLONXbcaG3nuN5n10Lsusm97pvvAFLfvEUxcorQsnC5bfuctEom' +
    '7pzzbzlIStpe0scl59Ky3VfUMOe4kdpeEkapC4E7hNu36/6ov1LmiKlvAdUoRs8i5bat1goy' +
    '9bV71SV2fiMOeNoEWski52x8jDTOr9gp9romniMX4+5KdjWzXBQpfcwaYguB3AXHXa7tEUz1' +
    'IfCIK8eU2zetztsqGivf/u2beYHzGmEQzBACo3X0CCuh2v1w511fyof8OccxzqL09juA1Mlv' +
    '9jScpaNznogZKfxik1vO02J3GT8m+3vueGfZ2TR9CqhVAUYq7tEH3N8mrRrnfMWtpVb9WvK8' +
    'M2tO9MJxoAAYcaIePWFzH3Erfd0edfAUDyPslmZrU8kTc609exbjDlu9lnWYeZWsj1l9F3O0' +
    'WBvpWnj2mghqFGOEx8JSv99wdL5nbUitRY86pLzniAMeC4Ha1/+3n9gckHLsFbp9EexsQqw9' +
    'EdXq6Fbb1bOQrLXF7LGtrdXHM0wCsbGx8n3to3Ey++Rf69vsrd4nxSOE8Lfqaux9UWq/9mt/' +
    '/VsesaD89c+f6P/f2++vgQKXrIZrHUM9/j8AAAEAgAAAQAAAIAAAEAAACAAABAAAAgAAAQCA' +
    'AABAAAAgAAAQAAAIAAAEAAACAAABAIAAAEAAACAAABAAAHx6hBD+lAFgPf8Kj5IyS1S2IAAA' +
    'AABJRU5ErkJggg==';



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
  this.shObject_ = new shapy.editor.Shader(this.gl_);
  this.shObject_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.OBJECT_VS);
  this.shObject_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.OBJECT_FS);
  this.shObject_.link();

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

  /** @private {!shapy.editor.Shader} @const */
  this.shCube_ = new shapy.editor.Shader(this.gl_);
  this.shCube_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.CUBE_VS);
  this.shCube_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.CUBE_FS);
  this.shCube_.link();

  /** @private {!shapy.editor.Shader} @const */
  this.shRig_ = new shapy.editor.Shader(this.gl_);
  this.shRig_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.RIG_VS);
  this.shRig_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.RIG_FS);
  this.shRig_.link();

  /** @private {!shapy.editor.Mesh} @const */
  this.msCube_ = shapy.editor.Mesh.createCube(gl, 1, 1, 1);
  this.txCube_ = this.loadTexture_(shapy.editor.CUBE_TEXTURE);

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

  // Cached mesh + model matrix pairs
  this.objectCache_ = {};

  // History - stored as a list of lists indexed by object ID
  this.objectHistory_ = {};
};


/**
 * Loads a hardcoded texture :).
 *
 * @private
 *
 * @param {string} data Base64 encoded image.
 *
 * @return {!WebGLTexture} Decoded texture.
 */
shapy.editor.Renderer.prototype.loadTexture_ = function(data) {
  var tex = this.gl_.createTexture();
  var img = new Image();

  img.onload = goog.bind(function() {
    this.gl_.bindTexture(goog.webgl.TEXTURE_2D, tex);
    this.gl_.texImage2D(
        goog.webgl.TEXTURE_2D,
        0,
        goog.webgl.RGBA,
        goog.webgl.RGBA,
        goog.webgl.UNSIGNED_BYTE, img);
    this.gl_.texParameteri(
        goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_MAG_FILTER,
        goog.webgl.LINEAR);
    this.gl_.texParameteri(
        goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_MIN_FILTER,
        goog.webgl.LINEAR);
    this.gl_.texParameteri(
        goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_WRAP_S,
        goog.webgl.CLAMP_TO_EDGE);
    this.gl_.texParameteri(
        goog.webgl.TEXTURE_2D,
        goog.webgl.TEXTURE_WRAP_T,
        goog.webgl.CLAMP_TO_EDGE);
    this.gl_.bindTexture(goog.webgl.TEXTURE_2D, null);
    tex.loaded = true;
  }, this);
  img.src = data;

  return tex;
};


/**
 * Update a mesh
 *
 * @param {shapy.editor.Object} object Object to update.
 */
shapy.editor.Renderer.prototype.updateObject = function(object) {
  object.dirtyMesh = false;

  // Re-build mesh
  var data = object.getGeometryData();
  var mesh = shapy.editor.Mesh.createFromObject(
      this.gl_, data.vertices, data.edges, data.faces)
  this.objectCache_[object.id] = [mesh, object.model_];

  // Store this revision
  if (!(object.id in this.objectHistory_))
    this.objectHistory_[object.id] = [];
  this.objectHistory_[object.id].push(mesh);
};


/**
 * Start rendering a scene.
 */
shapy.editor.Renderer.prototype.start = function() {
  this.gl_.clearColor(0.95, 1, 1, 1);
  this.gl_.clear(goog.webgl.COLOR_BUFFER_BIT | goog.webgl.DEPTH_BUFFER_BIT);
};


/**
 * Renders all objects.
 *
 * @param {!shapy.editor.Viewport} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderObjects = function(vp, objects) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  this.shObject_.use();

  goog.object.forEach(this.objectCache_, function(pair, id, meshes) {
    var mvp = goog.vec.Mat4.createFloat32();
    goog.vec.Mat4.multMat(vp.camera.vp, pair[1], mvp);
    this.shObject_.uniformMat4x4('u_mvp', mvp);
    pair[0].render(this.shObject_);
  }, this);
};


/**
 * Renders the ground plane.
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
    this.shGround_.uniformMat4x4('u_vp', vp.camera.vp);
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
  {
    this.shBorder_.use();
    this.shBorder_.uniform2f('u_size', vp.rect.w, vp.rect.h);
    vp.active ?
        this.shBorder_.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0) :
        this.shBorder_.uniform4f('u_colour', 0.4, 0.4, 0.4, 1.0);

    this.gl_.enableVertexAttribArray(0);
    this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfRect_);
    this.gl_.vertexAttribPointer(0, 2, goog.webgl.FLOAT, false, 8, 0);
    this.gl_.drawArrays(goog.webgl.LINE_LOOP, 0, 4);
    this.gl_.disableVertexAttribArray(0);
  }
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

  if (this.txCube_.loaded) {
    // Render cube.
    this.shCube_.use();
    this.shCube_.uniformMat4x4('u_view', vp.camCube.view);
    this.shCube_.uniformMat4x4('u_proj', vp.camCube.proj);
    this.shCube_.uniformMat4x4('u_vp', vp.camCube.vp);

    this.gl_.bindTexture(goog.webgl.TEXTURE_2D, this.txCube_);
    vp.camCube.render(this.gl_, this.shCube_);
  }

  this.gl_.enable(goog.webgl.DEPTH_TEST);
};


/**
 * Renders a rig used by the editor.
 *
 * @param {!shapy.editor.Viewport} vp Active viewport.
 * @param {!shapy.editor.Rig} rig Rig to be displayed.
 */
shapy.editor.Renderer.prototype.renderRig = function(vp, rig) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  this.gl_.depthFunc(goog.webgl.ALWAYS);
  {
    this.shRig_.use();
    this.shRig_.uniformMat4x4('u_view', vp.camera.view);
    this.shRig_.uniformMat4x4('u_proj', vp.camera.proj);
    this.shRig_.uniformMat4x4('u_vp', vp.camera.vp);
    rig.render(this.gl_, this.shRig_);
  }
  this.gl_.depthFunc(goog.webgl.LEQUAL);
};
