// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Mesh');

goog.require('goog.webgl');



/**
 * Mesh class with static factory method for specific meshes.
 *
 * All meshes contain a list of vertices used by the renderer. Since there
 * are many different shaders rendering the objects, they are parametrised as:
 *
 * +----+----+----------------+--------------------+
 * | of | ln | Fields         | Description        |
 * +----+----+----------------+--------------------+
 * | 0  | 12 | vx, vy, vz     | Vertex position    |
 * | 12 | 12 | nx, ny, nz     | Normal vector      |
 * | 24 | 8  | s, t           | Texture coordinate |
 * | 32 | 16 | cx, cy, cz, ca | Diffuse colour     |
 * | 48 | 12 | bx, by, bz     | Barycentric coord  |
 * | 60 | 4  |                | Padding            |
 * +----+----+----------------+--------------------+
 *
 * @constructor
 *
 * @param {!WebGLContext} gl     Context.
 * @param {!Float32Array} buffer Buffer data.
 * @param {!Object}       data   Object config.
 */
shapy.editor.Mesh = function(gl, buffer, data) {
  /** @private {!WebGLContext} @const */
  this.gl_ = gl;
  /** @private {!WebGLBuffer} @const */
  this.buffer_ = gl.createBuffer();
  /** @private {number} @const */
  this.indices_ = buffer.length >> 4;
  /** @private {!goog.vec.Vec4} @const */
  this.border_ = data.border ?
      goog.vec.Vec4.createFloat32FromValues(
          data.border[0], data.border[1], data.border[2], 1.0) :
      goog.vec.Vec3.createFloat32FromValues(
          0, 0, 0, 0);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, buffer, goog.webgl.STATIC_DRAW);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, null);
};


/**
 * Destroys a mesh.
 */
shapy.editor.Mesh.prototype.free = function() {

};


/**
 * Renders the mesh.
 *
 * @param {!shapy.editor.Shader} sh Shader program.
 */
shapy.editor.Mesh.prototype.render = function(sh) {
  this.gl_.enableVertexAttribArray(0);
  this.gl_.enableVertexAttribArray(1);
  this.gl_.enableVertexAttribArray(2);
  this.gl_.enableVertexAttribArray(3);
  this.gl_.enableVertexAttribArray(4);

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 64, 0);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.vertexAttribPointer(1, 3, goog.webgl.FLOAT, false, 64, 12);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.vertexAttribPointer(2, 2, goog.webgl.FLOAT, false, 64, 24);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 64, 32);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.vertexAttribPointer(4, 3, goog.webgl.FLOAT, false, 64, 48);

  this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, this.indices_);

  this.gl_.disableVertexAttribArray(4);
  this.gl_.disableVertexAttribArray(3);
  this.gl_.disableVertexAttribArray(2);
  this.gl_.disableVertexAttribArray(1);
  this.gl_.disableVertexAttribArray(0);
};


/**
 * Checks if the mesh intersects a ray.
 */
shapy.editor.Mesh.prototype.intersects = function(ray) {

};


/**
 * Creates a plane.
 */
shapy.editor.Mesh.createPlane = function(gl, w, h, sx, sy) {

};


/**
 * Creates an arrow.
 */
shapy.editor.Mesh.createArrow = function(gl, dir) {

};


/**
 * Creates a cube.
 */
shapy.editor.Mesh.createCube = function(gl, w, h, d) {

};


/**
 * Creates a sphere.
 */
shapy.editor.Mesh.createSphere = function(gl, r, phi, theta) {

};


/**
 * Creates a circle.
 */
shapy.editor.Mesh.createCircle = function(gl, norm, r) {
};


/**
 * Creates a mesh for the ground plane.
 *
 * @param {!WebGLContext} gl Context.
 * @param {number}        w  Width of the plane.
 * @param {number}        h  Height of the plane.
 *
 * @return {shapy.editor.mesh}
 */
shapy.editor.Mesh.createGroundPlane = function(gl, w, h) {
  var r = 0.2, g = 0.2, b = 0.2, a = 1.0;
  var d = new Float32Array((w + 1) * (h + 1) * 6 << 4);
  for (var i = 0, k = 0, x = -w / 2; i < w; ++i, ++x) {
    for (var j = 0, y = -h / 2; j < h; ++j, ++y) {
      d[k++] = (x + 0); d[k++] = 0; d[k++] = (y + 0);
      d[k++] = 0;       d[k++] = 1; d[k++] = 0;
      d[k++] = 0;       d[k++] = 1;
      d[k++] = r;       d[k++] = g; d[k++] = b; d[k++] = a;
      d[k++] = 1;       d[k++] = 0; d[k++] = 0;
      d[k++] = 0;

      d[k++] = (x + 1); d[k++] = 0; d[k++] = (y + 0);
      d[k++] = 0;       d[k++] = 1; d[k++] = 0;
      d[k++] = 0;       d[k++] = 1;
      d[k++] = r;       d[k++] = g; d[k++] = b; d[k++] = a;
      d[k++] = 0;       d[k++] = 1; d[k++] = 0;
      d[k++] = 0;

      d[k++] = (x + 1); d[k++] = 0; d[k++] = (y + 1);
      d[k++] = 0;       d[k++] = 1; d[k++] = 0;
      d[k++] = 0;       d[k++] = 1;
      d[k++] = r;       d[k++] = g; d[k++] = b; d[k++] = a;
      d[k++] = 0;       d[k++] = 0; d[k++] = 1;
      d[k++] = 0;

      d[k++] = (x + 0); d[k++] = 0; d[k++] = (y + 0);
      d[k++] = 0;       d[k++] = 1; d[k++] = 0;
      d[k++] = 0;       d[k++] = 1;
      d[k++] = r;       d[k++] = g; d[k++] = b; d[k++] = a;
      d[k++] = 1;       d[k++] = 0; d[k++] = 0;
      d[k++] = 0;

      d[k++] = (x + 1); d[k++] = 0; d[k++] = (y + 1);
      d[k++] = 0;       d[k++] = 1; d[k++] = 0;
      d[k++] = 0;       d[k++] = 1;
      d[k++] = r;       d[k++] = g; d[k++] = b; d[k++] = a;
      d[k++] = 0;       d[k++] = 1; d[k++] = 0;
      d[k++] = 0;

      d[k++] = (x + 0); d[k++] = 0; d[k++] = (y + 1);
      d[k++] = 0;       d[k++] = 1; d[k++] = 0;
      d[k++] = 0;       d[k++] = 1;
      d[k++] = r;       d[k++] = g; d[k++] = b; d[k++] = a;
      d[k++] = 0;       d[k++] = 0; d[k++] = 1;
      d[k++] = 0;
    }
  }

  return new shapy.editor.Mesh(gl, d, {
      border: [1, 1, 1]
  });
};

