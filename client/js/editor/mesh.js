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
  /** @public {!goog.vec.Vec4} @const */
  this.border = data.border ?
      goog.vec.Vec4.createFloat32FromValues(
          data.border[0], data.border[1], data.border[2], data.border[3]) :
      goog.vec.Vec4.createFloat32FromValues(
          1, 1, 1, 1);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.buffer_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, buffer, goog.webgl.STATIC_DRAW);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, null);
};


/**
 * Destroys a mesh.
 */
shapy.editor.Mesh.prototype.free = function() {
  // TODO: This should be implemented ASAP.
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
  this.gl_.vertexAttribPointer(1, 3, goog.webgl.FLOAT, false, 64, 12);
  this.gl_.vertexAttribPointer(2, 2, goog.webgl.FLOAT, false, 64, 24);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 64, 32);
  this.gl_.vertexAttribPointer(4, 3, goog.webgl.FLOAT, false, 64, 48);

  sh.uniform4f('u_border',
      this.border[0], this.border[1], this.border[2], this.border[3]);
  this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, this.indices_);

  this.gl_.disableVertexAttribArray(4);
  this.gl_.disableVertexAttribArray(3);
  this.gl_.disableVertexAttribArray(2);
  this.gl_.disableVertexAttribArray(1);
  this.gl_.disableVertexAttribArray(0);
};


/**
 * Create from an object
 *
 * @param {!WebGLContext} gl Context
 * @param {type}          v Vertices
 * @param {type}          e Edges
 * @param {type}          f Faces
 *
 * @return {!shapy.editor.Mesh}
 */
shapy.editor.Mesh.createFromObject = function(gl, v, e, f) {
  var size = f.length * 3;

  // Allocate vertex buffer
  var d = new Float32Array(size << 4);
  var k = 0;

  var addVertex = function(pos, a, b, c) {
    // Position.
    d[k++] = pos[0];
    d[k++] = pos[1];
    d[k++] = pos[2];

    // Normal.
    d[k++] = 0; d[k++] = 0; d[k++] = 0;

    // UV.
    d[k++] = 0; d[k++] = 0;

    // Diffuse.
    d[k++] = 0.2;
    d[k++] = 0.2;
    d[k++] = 0.2;
    d[k++] = 1;

    // Barycentric coordinate.
    d[k++] = a;
    d[k++] = b;
    d[k++] = c;

    // Padding.
    d[k++] = 0;
  };

  // For each face, figure out the 3 unique vertices, and emit the vertices
  goog.array.forEach(f, function(face) {
    //face = f[1];
    var faceVertices = face.getVertices_();

    // Emit vertices
    addVertex(faceVertices[0].position, 1, 0, 0);
    addVertex(faceVertices[1].position, 0, 1, 0);
    addVertex(faceVertices[2].position, 0, 0, 1);
  });

  return new shapy.editor.Mesh(gl, d, {});
};
