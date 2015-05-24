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
  'varying vec2 v_uv;                                                 \n' +
  'void main() {                                                      \n' +
  '  gl_FragColor = texture2D(u_texture, v_uv);                       \n' +
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
    'CXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wUYEBUZPQkZ/gAAABl0RVh0Q29tbWVudABD' +
    'cmVhdGVkIHdpdGggR0lNUFeBDhcAAAMdSURBVHja7d1dbuMgFAZQEmVXXj/ryjxF6lixAxgw' +
    '2OdIfWkzcbj8fNiinUcI4R0AuJ1XCCHEGG/Z+GVZgvZrv/Zr/13b/5SBAPckAAAEAAACAAAB' +
    'AIAAAEAAACAAABAAAAgAAAQAAAIAAAEAgAAAQAAAIAAAEAAACAAABAAAAgAAAQCAAABAAAAg' +
    'AAAIIYTwUgKAfMuybP4sxpj879av3XvflPevGgC/Pszng7Qqxuc1v94jxli9cKVtSu3krfdI' +
    '+VlqTXoO8q1rjtzHPcZByuf5do2cMVOzz0mXO4e/fX/9vdx+b34HkHrxFsXIKUKLwh1ZpEsX' +
    'gpQFvueEL6lBjVr06uPW46B04c5pW+/FvySIUzcCvYK99XhZ98lWH6XO9xaePYuRMmC3dnmp' +
    'u7/eHZw6EdevL2nPt53CmTX5df3cPp51B3ikLXsTP/W9z1g8Yoz/fW19b/0Z/35ttW39ul+v' +
    'n+Vx0V4fndW+p2LUm/xXaVevPr67krvaGR/71NoIzDR/ZnkcN9UpoKsvoH8HTc7z7ruEykwT' +
    'vaQvr7jIXH1TtCzL169ZNjivEQZBSQjYQZ5fk9rXHHkh2HtcMdLnof/cm/kO4FVz8I82Sa60' +
    'cJ85oGr166+TLjmnxe480XNORN3hbsumrHEAlJ4CalWAK94FfGtPTjtb1qRWv5acd55xon/a' +
    'lXrwoXScXPVu2EZysAAYcaH2KOi8mqh92aapRuAd2STM/ljlynPz0sdAt4ox+61e7rHMOy2a' +
    'anG8Rle5S7qjvTv6kebC86xBXqMYZz4HzT3aVvpLILk7vF41SbnOiAO+9TjIPde/V8fcx382' +
    'Auf0f84poE89Rjkx9Oo5CFISMbcYrQd/yfPIGu1qvTj3uK0doRZnjoMam6SafTHa44/ZF/9a' +
    'v83e6jopHiGE911vxT+TTvu1X/vb3BHvhejRP3+h/4+3318DBbrshmu9hnr8fwAAAgAAAQCA' +
    'AABAAAAgAAAQAAAIAAAEAAACAAABAIAAAEAAACAAABAAAAgAAAQAAAIAAAEAgAAAQAAAIAAA' +
    'WHuEEN7KAHA//wCB7wmMcLEBOgAAAABJRU5ErkJggg==';



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
    vp.active ?
      this.shBorder_.uniform4f('u_colour', 1, 1, 0, 1) :
      this.shBorder_.uniform4f('u_colour', .1, .1, .1, .1);

    this.shBorder_.uniform2f('u_size', vp.rect.w, vp.rect.h);
    this.shBorder_.uniformMat4x4('u_view', this.identity);
    this.shBorder_.uniformMat4x4('u_proj', this.identity);
    this.shBorder_.uniformMat4x4('u_vp', this.identity);

    this.gl_.enableVertexAttribArray(0);
    this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.bfRect_);
    this.gl_.vertexAttribPointer(0, 2, goog.webgl.FLOAT, false, 8, 0);
    this.gl_.drawArrays(goog.webgl.LINE_LOOP, 0, 4);
    this.gl_.disableVertexAttribArray(0);
  }
  this.gl_.enable(goog.webgl.DEPTH_TEST);
};


/**
 * @type {number} @const
 */
shapy.editor.Renderer.CUBE_SIZE = 120;

/**
 * @type {number} @const
 */
shapy.editor.Renderer.CUBE_DISTANCE = 5;


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
    vp.camCube.render(this.gl_, this.shRig_);
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
  this.gl_.clear(goog.webgl.DEPTH_BUFFER_BIT);

  this.gl_.viewport(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);
  this.gl_.scissor(vp.rect.x, vp.rect.y, vp.rect.w, vp.rect.h);

  {
    this.shRig_.use();
    this.shRig_.uniformMat4x4('u_view', vp.camera.view);
    this.shRig_.uniformMat4x4('u_proj', vp.camera.proj);
    this.shRig_.uniformMat4x4('u_vp', vp.camera.vp);
    rig.render(this.gl_, this.shRig_);
  }
};
