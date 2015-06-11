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
shapy.editor.OBJECT_TEXTURE_VS =
  'attribute vec3 a_vertex;                         \n' +
  'attribute vec4 a_colour;                         \n' +
  'attribute vec2 a_uv;                             \n' +
  'attribute vec3 a_bary;                           \n' +

  'uniform mat4 u_mvp;                              \n' +

  'varying vec4 v_colour;                           \n' +
  'varying vec2 v_uv;                               \n' +

  'void main() {                                    \n' +
  '  v_colour = a_colour;                           \n' +
  '  v_uv = a_uv;                                   \n' +
  '  gl_PointSize = 7.0;                            \n' +
  '  gl_Position = u_mvp * vec4(a_vertex, 1);       \n' +
  '}                                                \n';


/** @type {string} @const */
shapy.editor.OBJECT_TEXTURE_FS =
  '#extension GL_OES_standard_derivatives : enable          \n' +

  'precision mediump float;                                 \n' +

  'uniform sampler2D u_texture;                             \n' +

  'varying vec4 v_colour;                                   \n' +
  'varying vec2 v_uv;                                       \n' +

  'void main() {                                            \n' +
  '  vec4 texture = texture2D(u_texture, v_uv);             \n' +
  '  gl_FragColor = vec4(v_colour.rgb * texture.rgb, 1.0);  \n' +
  '}                                                        \n';


/** @type {string} @const */
shapy.editor.OBJECT_COLOUR_VS =
  'attribute vec3 a_vertex;                         \n' +
  'attribute vec4 a_colour;                         \n' +
  'attribute vec3 a_bary;                           \n' +

  'uniform mat4 u_mvp;                              \n' +

  'varying vec4 v_colour;                           \n' +

  'void main() {                                    \n' +
  '  v_colour = a_colour;                           \n' +
  '  gl_PointSize = 7.0;                            \n' +
  '  gl_Position = u_mvp * vec4(a_vertex, 1);       \n' +
  '}                                                \n';


/** @type {string} @const */
shapy.editor.OBJECT_COLOUR_FS =
  '#extension GL_OES_standard_derivatives : enable  \n' +

  'precision mediump float;                         \n' +

  'varying vec4 v_colour;                           \n' +

  'void main() {                                    \n' +
  '  gl_FragColor = vec4(v_colour.rgb, 1.0);        \n' +
  '}                                                \n';


/** @type {string} @const */
shapy.editor.UV_VS =
  'attribute vec2 a_vertex;                                       \n' +
  'attribute vec4 a_colour;                                       \n' +

  'uniform mat4 u_mvp;                                            \n' +

  'varying vec4 v_colour;                                         \n' +

  'void main() {                                                  \n' +
  '  v_colour = a_colour;                                         \n' +
  '  gl_PointSize = 7.0;                                          \n' +
  '  gl_Position = u_mvp * vec4(a_vertex.x, 0, a_vertex.y, 1);    \n' +
  '}                                                              \n';


/** @type {string} @const */
shapy.editor.UV_FS =
  '#extension GL_OES_standard_derivatives : enable                    \n' +

  'precision mediump float;                                           \n' +

  'varying vec4 v_colour;                                             \n' +

  'void main() {                                                      \n' +
  '  gl_FragColor = v_colour;                                         \n' +
  '}                                                                  \n';


/** @type {string} @const */
shapy.editor.OVERLAY_VS =
  'attribute vec2 a_vertex;                                           \n' +
  'uniform vec2 u_size;                                               \n' +
  'uniform vec2 u_pos;\n' +
  'uniform vec2 u_dim;\n' +
  'void main() {                                                      \n' +
  '  vec2 pos = u_pos + a_vertex * u_dim;                             \n' +
  '  pos = 2.0 * pos / u_size - 1.0;                                    \n' +
  '  gl_Position = vec4(pos * (1.0 - 0.5 / u_size), 0.0, 1.0);   \n' +
  '}                                                                  \n';


/** @type {string} @const */
shapy.editor.OVERLAY_FS =
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
  'uniform mat4 u_vp;                                                 \n' +
  'uniform vec2 u_size;                                               \n' +
  'varying vec3 v_vertex;                                             \n' +
  'varying vec2 v_uv;                                                 \n' +

  'void main() {                                                      \n' +
  '  vec3 vertex = a_vertex * vec3(u_size.x, 0, u_size.y);            \n' +
  '  v_uv = (a_vertex.xz + vec2(1.0)) * vec2(0.5);                    \n' +
  '  v_vertex = vertex;                                               \n' +
  '  gl_Position = u_vp * vec4(vertex, 1.0);                          \n' +
  '}                                                                  \n';


/** @type {string} @const */
shapy.editor.GROUND_FS =
  '#extension GL_OES_standard_derivatives : enable                      \n' +

  'precision mediump float;                                             \n' +
  'uniform float u_zoom;                                                \n' +
  'uniform float u_use_texture;                                         \n' +
  'uniform sampler2D u_texture;\n' +
  'varying vec3 v_vertex;\n' +
  'varying vec2 v_uv;\n' +

  'float alpha(float d, float w) {\n' +
  '  return max(smoothstep(w - fwidth(d), w + fwidth(d), d), 0.0);\n' +
  '}\n' +

  'void main() {                                                      \n' +
  '  float ax = alpha(distance(v_vertex.x, 0.0), 0.05);\n' +
  '  float az = alpha(distance(v_vertex.z, 0.0), 0.05);\n' +

  '  vec2 a1 = fract(v_vertex.xz);\n' +
  '  a1 = min(a1, 1.0 - a1);\n' +
  '  float a1x = alpha(a1.x, 0.01 * u_zoom);\n' +
  '  float a1z = alpha(a1.y, 0.01 * u_zoom);\n' +

  '  vec2 a5 = fract(v_vertex.xz / 5.0);\n' +
  '  a5 = min(a5, 1.0 - a5) * 5.0;\n' +
  '  float a5x = alpha(a5.x, 0.02);\n' +
  '  float a5z = alpha(a5.y, 0.02);\n' +

  '  vec4 colour;\n' +
  '  if (u_use_texture > 0.0) {\n' +
  '    colour = texture2D(u_texture, v_uv);\n' +
  '  } else {\n' +
  '    colour = vec4(0.2, 0.2, 1.0, 0.5);\n' +
  '  }\n' +
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
  'uniform float u_alpha;\n' +
  'void main(void) {\n' +
  '  gl_FragColor = vec4(u_colour.rgb, u_alpha);\n' +
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
  this.shObjectTexture_ = new shapy.editor.Shader(this.gl_);
  this.shObjectTexture_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.OBJECT_TEXTURE_VS);
  this.shObjectTexture_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.OBJECT_TEXTURE_FS);
  this.shObjectTexture_.link();

  /** @private {!shapy.editor.Shader} @const */
  this.shObjectColour_ = new shapy.editor.Shader(this.gl_);
  this.shObjectColour_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.OBJECT_COLOUR_VS);
  this.shObjectColour_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.OBJECT_COLOUR_FS);
  this.shObjectColour_.link();

  /** @private {!shapy.editor.Shader} @const */
  this.shUV_ = new shapy.editor.Shader(this.gl_);
  this.shUV_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.UV_VS);
  this.shUV_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.UV_FS);
  this.shUV_.link();

  /** @private {!shapy.editor.Shader} @const */
  this.shOverlay_ = new shapy.editor.Shader(this.gl_);
  this.shOverlay_.compile(goog.webgl.VERTEX_SHADER, shapy.editor.OVERLAY_VS);
  this.shOverlay_.compile(goog.webgl.FRAGMENT_SHADER, shapy.editor.OVERLAY_FS);
  this.shOverlay_.link();

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

  /** @private {!WebGLTexture} @const */
  this.txCube_ = this.loadTexture_(shapy.editor.CUBE_TEXTURE);

  /** @private {!WebGLTexture} @const */
  this.txWhite_ = this.gl_.createTexture();
  this.gl_.bindTexture(goog.webgl.TEXTURE_2D, this.txWhite_);
  this.gl_.texImage2D(
      goog.webgl.TEXTURE_2D,
      0,
      goog.webgl.RGB,
      1, 1, 0,
      goog.webgl.RGB,
      goog.webgl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255]));

  /** @private {!WebGLBuffer} @const */
  this.bfRect_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfRect_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1
  ]), goog.webgl.STATIC_DRAW);
  this.bfQuad_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, this.bfQuad_);
  this.gl_.bufferData(goog.webgl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
    0, 1, 2, 0, 2, 3
  ]), goog.webgl.STATIC_DRAW);

  /** @private {!WebGLBuffer} @const */
  this.bfGround_ = this.gl_.createBuffer();
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfGround_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
      -1, 0, -1, 1, 0, 1, -1, 0, 1,
      -1, 0, -1, 1, 0, 1, 1, 0, -1
  ]), goog.webgl.STATIC_DRAW);

  /**
   * Cached meshes and their source objects.
   *
   * @private {!Object<string, Object>}
   */
  this.objectCache_ = {};

  /**
   * Cached textures and their source assets.
   *
   * @private {!Object<string, Object>}
   */
  this.textureCache_ = {};
};


/**
 * Cleans up resources used by the renderer.
 */
shapy.editor.Renderer.prototype.destroy = function() {
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
 * Updates a cached texture.
 *
 * @param {shapy.browser.Texture} texture Texture to update.
 */
shapy.editor.Renderer.prototype.updateTexture = function(texture) {
  // Bail out if texture not dirty.
  if (!texture.dirty) {
    return;
  }
  texture.dirty = false;

  // Rebuild the texture.
  var tex;
  if (goog.object.containsKey(this.textureCache_, texture.id)) {
    tex = this.textureCache_[texture.id].texture;
  } else {
    tex = this.gl_.createTexture();
    this.textureCache_[texture.id] = {
      texture: tex,
      object: texture
    };
  }
  this.gl_.bindTexture(goog.webgl.TEXTURE_2D, tex);
  this.gl_.texImage2D(
      goog.webgl.TEXTURE_2D,
      0,
      goog.webgl.RGB,
      texture.width, texture.height,
      0,
      goog.webgl.RGB,
      goog.webgl.UNSIGNED_BYTE,
      texture.data);
  this.gl_.texParameteri(
      goog.webgl.TEXTURE_2D,
      goog.webgl.TEXTURE_MAG_FILTER,
      goog.webgl.LINEAR);
  this.gl_.texParameteri(
      goog.webgl.TEXTURE_2D,
      goog.webgl.TEXTURE_MIN_FILTER,
      goog.webgl.LINEAR);
  this.gl_.bindTexture(goog.webgl.TEXTURE_2D, null);
};


/**
 * Updates the cached mesh attached to an object.
 *
 * @param {shapy.editor.Object} object Object to update.
 */
shapy.editor.Renderer.prototype.updateObject = function(object) {
  // Bail out if object not dirty.
  if (!object.dirty) {
    return;
  }
  object.dirty = false;

  // Recompute matrices.
  object.computeModel();

  // Clean up old mesh.
  if (goog.object.containsKey(this.objectCache_, object.id)) {
    this.objectCache_[object.id].mesh.destroy();
  }

  // Re-build mesh.
  this.objectCache_[object.id] = {
    mesh: new shapy.editor.Mesh(this.gl_, object),
    object: object
  };

  // Reference the texture.
  if (goog.object.containsKey(this.textureCache_, object.texture)) {
    this.textureCache_[object.texture].deleted = false;
  }
};


/**
 * Start rendering a scene.
 */
shapy.editor.Renderer.prototype.start = function() {
  this.gl_.clearColor(0.9, 0.9, 0.9, 1);
  this.gl_.clear(
    goog.webgl.COLOR_BUFFER_BIT |
    goog.webgl.DEPTH_BUFFER_BIT |
    goog.webgl.STENCIL_BUFFER_BIT);

  // Delete unused meshes.
  this.objectCache_ = goog.object.filter(this.objectCache_, function(obj) {
    if (obj.object && !obj.object.deleted) {
      return true;
    }
    obj.mesh.destroy();
    return false;
  }, this);

  // Delete unused textures.
  this.textureCache_ = goog.object.filter(this.textureCache_, function(tex) {
    if (tex.object && !tex.object.deleted) {
      return true;
    }
    this.gl_.deleteTexture(tex.texture);
    return false;
  }, this);
};


/**
 * Renders all objects.
 *
 * @param {!shapy.editor.Viewport} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderObjects = function(vp) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  goog.object.forEach(this.objectCache_, function(obj) {
    var mvp = goog.vec.Mat4.createFloat32();
    goog.vec.Mat4.multMat(vp.camera.vp, obj.object.model, mvp);
    this.gl_.bindTexture(goog.webgl.TEXTURE_2D, this.txCube_);

    // Render points and edges
    this.shObjectColour_.use();
    this.shObjectColour_.uniformMat4x4('u_mvp', mvp);
    obj.mesh.renderPointsEdges(this.shObjectColour_);

    // Render faces
    if (obj.object.texture &&
        goog.object.containsKey(this.textureCache_, obj.object.texture))
    {
      this.gl_.bindTexture(
          goog.webgl.TEXTURE_2D,
          this.textureCache_[obj.object.texture].texture);
      this.shObjectTexture_.use();
      this.shObjectTexture_.uniformMat4x4('u_mvp', mvp);
      obj.mesh.render(this.shObjectTexture_);
    } else {
      obj.mesh.render(this.shObjectColour_);
    }
    this.gl_.bindTexture(goog.webgl.TEXTURE_2D, null);
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

  // Renders the border plane.
  this.gl_.enable(goog.webgl.BLEND);
  this.gl_.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);
  {
    this.shGround_.use();
    this.shGround_.uniformMat4x4('u_vp', vp.camera.vp);
    this.shGround_.uniform2f('u_size', 35, 35);
    this.shGround_.uniform1f('u_zoom', 1);
    this.shGround_.uniform1f('u_use_texture', 0.0);
    this.gl_.bindTexture(goog.webgl.TEXTURE_2D, this.txWhite_);

    this.gl_.lineWidth(1.0);
    this.gl_.enableVertexAttribArray(0);
    this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfGround_);
    this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);
    this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, 6);
    this.gl_.disableVertexAttribArray(0);
  }
  this.gl_.disable(goog.webgl.BLEND);
};


/**
 * Renders the background of the UV editor.
 *
 * @param {!shapy.editor.Viewport.UV} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderBackground = function(vp) {

  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  // Renders the border plane.
  this.gl_.enable(goog.webgl.BLEND);
  this.gl_.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);
  {
    this.shGround_.use();
    this.shGround_.uniformMat4x4('u_vp', vp.vp);
    this.shGround_.uniform2f('u_size',
        shapy.editor.Viewport.UV.SIZE,
        shapy.editor.Viewport.UV.SIZE);
    this.shGround_.uniform1f('u_zoom', 2.0);

    if (vp.object && vp.object.texture &&
        goog.object.containsKey(this.textureCache_, vp.object.texture))
    {
      this.shGround_.uniform1f('u_use_texture', 1);
      this.gl_.bindTexture(
          goog.webgl.TEXTURE_2D,
          this.textureCache_[vp.object.texture].texture);
    } else {
      this.shGround_.uniform1f('u_use_texture', 0);
      this.gl_.bindTexture(goog.webgl.TEXTURE_2D, this.txWhite_);
    }

    this.gl_.lineWidth(1.0);
    this.gl_.enableVertexAttribArray(0);
    this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfGround_);
    this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);
    this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, 6);
    this.gl_.disableVertexAttribArray(0);
  }
  this.gl_.disable(goog.webgl.BLEND);
};


/**
 * Renders the border & selection box.
 *
 * @param {!shapy.editor.Viewport} vp Current viewport.
 */
shapy.editor.Renderer.prototype.renderOverlay = function(vp) {
  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  this.gl_.lineWidth(1.0);
  this.gl_.disable(goog.webgl.DEPTH_TEST);
  this.gl_.enable(goog.webgl.BLEND);
  this.gl_.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);
  this.gl_.enableVertexAttribArray(0);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfRect_);
  this.gl_.bindBuffer(goog.webgl.ELEMENT_ARRAY_BUFFER, this.bfQuad_);
  this.gl_.vertexAttribPointer(0, 2, goog.webgl.FLOAT, false, 8, 0);
  {
    this.shOverlay_.use();
    this.shOverlay_.uniform2f('u_size', vp.rect.w, vp.rect.h);
    this.shOverlay_.uniform2f('u_pos', 0, 0);
    this.shOverlay_.uniform2f('u_dim', vp.rect.w, vp.rect.h);

    // Border.
    vp.active ?
        this.shOverlay_.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0) :
        this.shOverlay_.uniform4f('u_colour', 0.4, 0.4, 0.4, 1.0);
    this.gl_.drawArrays(goog.webgl.LINE_LOOP, 0, 4);

    // Selection box.
    if (vp.group) {
      this.shOverlay_.uniform2f('u_pos', vp.group.left, vp.group.top);
      this.shOverlay_.uniform2f('u_dim', vp.group.width, vp.group.height);

      this.shOverlay_.uniform4f('u_colour', 0.4, 0.4, 0.4, 1.0);
      this.gl_.drawArrays(goog.webgl.LINE_LOOP, 0, 4);
      this.shOverlay_.uniform4f('u_colour', 0.2, 0.2, 0.2, 0.7);
      this.gl_.drawElements(
          goog.webgl.TRIANGLES, 6, goog.webgl.UNSIGNED_SHORT, 0);
    }
  }
  this.gl_.disableVertexAttribArray(0);
  this.gl_.disable(goog.webgl.BLEND);
  this.gl_.enable(goog.webgl.DEPTH_TEST);
};


/**
 * Renders the cube
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

  // Compute distance from the centre and pass this to the rig
  if (rig) {
    rig.setScale(vp.camera);
  }

  this.gl_.enable(goog.webgl.STENCIL_TEST);
  {
    this.shRig_.use();
    this.shRig_.uniformMat4x4('u_vp', vp.camera.vp);

    // Render rigs outside objects, writing 1 to the stencil buffer
    this.gl_.stencilFunc(goog.webgl.ALWAYS, 1, 0xFF);
    this.gl_.stencilOp(goog.webgl.KEEP, goog.webgl.KEEP, goog.webgl.REPLACE);
    this.shRig_.uniform1f('u_alpha', 1.0);
    rig.render(this.gl_, this.shRig_);

    // Clear depth buffer
    this.gl_.clear(goog.webgl.DEPTH_BUFFER_BIT);

    // Render rig inside objects by drawing to parts not covered by the solid
    // parts of the rig
    this.gl_.stencilFunc(goog.webgl.EQUAL, 0, 0xFF);
    this.gl_.stencilOp(goog.webgl.KEEP, goog.webgl.KEEP, goog.webgl.KEEP);
    this.shRig_.uniform1f('u_alpha', 0.4);
    rig.render(this.gl_, this.shRig_);
  }

  this.gl_.disable(goog.webgl.STENCIL_TEST);
};


/**
 * Renders the UV mesh.
 *
 * @param {!shapy.editor.Viewport.UV} vp
 */
shapy.editor.Renderer.prototype.renderUVMesh = function(vp) {
  if (!vp.object || !goog.object.containsKey(this.objectCache_, vp.object.id)) {
    return;
  }
  var mvp = goog.vec.Mat4.createFloat32();

  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  this.gl_.disable(goog.webgl.DEPTH_TEST);
  this.gl_.enable(goog.webgl.BLEND);
  this.gl_.blendFunc(goog.webgl.SRC_ALPHA, goog.webgl.ONE_MINUS_SRC_ALPHA);
  {
    this.shUV_.use();
    goog.vec.Mat4.makeIdentity(mvp);
    goog.vec.Mat4.multMat(mvp, vp.proj, mvp);
    goog.vec.Mat4.multMat(mvp, vp.view, mvp);
    this.shUV_.uniformMat4x4('u_mvp', mvp);
    this.objectCache_[vp.object.id].mesh.renderUV();
  }
  this.gl_.enable(goog.webgl.DEPTH_TEST);
  this.gl_.disable(goog.webgl.BLEND);
};
