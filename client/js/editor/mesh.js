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
 * Checks if the mesh intersects a ray.
 */
shapy.editor.Mesh.prototype.intersects = function(ray) {

};


/**
 * Create from an object
 *
 * @param {!WebGLContext} gl Context
 * @param {type}          v Vertices
 * @param {type}          e Edges
 * @param {type}          f Faces
 */
shapy.editor.Mesh.createFromObject = function(gl, v, e, f) {
  // If a face has more than 3 edges, triangulate by treating the face as a
  // triangle fan primitive.

  // Calculate size of the vertex buffer
  var size = 0;
  for (var i = 0; i < f.length; i++) {
    // Every new vertex after 3 requires another 3 vertices in the buffer
    // Number of vertices in a face === number of edges in a face
    size += 3 + (f[i].length - 3) * 3;
  }

  // Allocate vertex buffer
  var d = new Float32Array(size << 6);
  var k = 0;

  var addVertex = function(x, y, z, a, b, c) {
    d[k++] = x; d[k++] = y; d[k++] = z; // position
    d[k++] = 0; d[k++] = 0; d[k++] = 0; // normal
    d[k++] = 0; d[k++] = 0; // texcoord
    d[k++] = 0.2; d[k++] = 0.2; d[k++] = 0.2; d[k++] = 1; // diffuse
    d[k++] = a; d[k++] = b; d[k++] = c;  // bary
    d[k++] = 0; // pad
  };

  // Fill out the vertex buffer
  // Just for reference:
  // * face[i] is the i'th edge in the face
  // * e[face[i]] gives the pair of vertices in the i'th edge of the face
  // * e[face[i]][0] gives the first vertex in the i'th edge of the face
  goog.array.forEach(f, function(face) {
    // Unfortunately, this algorithm is a bit more complicated than it should be
    // because edge i's tail doesn't necessarily points to edge i+1's head
    var a = e[face[0]][0];
    for (var j = 0; j < (face.length - 1); j++) { // edge ID
      var b = e[face[j]][1];
      var c = e[face[j + 1]][1];

      // If in the first iteration, we discover that 'a' is incorrect
      // (eg. [b, a], [b, c] or [b, a], [c, b] rather than [a, b], [b, c]) then
      // ensure 'a' is correct before continuing.
      if (j == 0) {
        if (e[face[0]][0] == e[face[1]][0] || e[face[0]][0] == e[face[1]][1]) {
          a = e[face[0]][1];
        }
      }

      // So there are 4 possible permutations of
      // [a, b], [b, c] where one are correct and three are incorrect, so
      // ensure that the correct values of b and c are chosen when generating
      // the triangle of [a, b, c].

      // Deal with the case [b, a], [b, c]
      if (e[face[j]][0] == e[face[j + 1]][0]) {
        b = e[face[j]][0];
      }

      // Deal with the case [b, a], [c, b]
      if (e[face[j]][0] == e[face[j + 1]][1]) {
        b = e[face[j]][0];
        c = e[face[j + 1]][0];
      }

      // Deal with the case [a, b], [c, b]
      if (e[face[j]][1] == e[face[j + 1]][1]) {
        c = e[face[j + 1]][0];
      }

      addVertex(v[a * 3], v[a * 3 + 1], v[a * 3 + 2], 1, 0, 0);
      addVertex(v[b * 3], v[b * 3 + 1], v[b * 3 + 2], 0, 1, 0);
      addVertex(v[c * 3], v[c * 3 + 1], v[c * 3 + 2], 0, 0, 1);
    }
  });

  return new shapy.editor.Mesh(gl, d, {});
};
