// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Mesh');

goog.require('goog.webgl');



/**
 * Mesh class containing renderable information about an object.
 *
 * @constructor
 *
 * @param {!WebGLContext}        gl     Context.
 * @param {!shapy.editor.Object} object Source object.
 */
shapy.editor.Mesh = function(gl, object) {
  /** @private {!WebGLContext} @const */
  this.gl_ = gl;
  /** @private {!shapy.editor.Object} @const */
  this.object_ = object;

  /** @private {!WebGLBuffer} @const */
  this.faces_ = this.gl_.createBuffer();
  /** @private {number} @const */
  this.faceCount_ = 0;

  /** @private {!WebGLBuffer} @const */
  this.edges_ = this.gl_.createBuffer();
  /** @private {number} @const */
  this.edgeCount_ = 0;

  /** @private {!WebGLBuffer} @const */
  this.verts_ = this.gl_.createBuffer();
  /** @private {number} @const */
  this.vertCount_ = 0;

  this.build_();
};


/**
 * Builds the mesh.
 */
shapy.editor.Mesh.prototype.build_ = function() {
  var r = 0, g = 0, b = 0;

  var add = function(d, pos) {
    d[k++] = pos[0]; d[k++] = pos[1]; d[k++] = pos[2];    // Position.
    d[k++] = 0; d[k++] = 0; d[k++] = 0;                   // Normal.
    d[k++] = 0; d[k++] = 0;                               // UV.
    d[k++] = r; d[k++] = g; d[k++] = b; d[k++] = 1;       // Diffuse.
  };

  // Create mesh for rendering all the faces.
  this.faceCount_ = this.object_.faces.length * 3;
  k = 0;
  var f = new Float32Array(this.faceCount_ * 48);
  goog.array.forEach(this.object_.faces, function(face) {
    var faceVertices = face.getVertices_();

    if (face.selected) {
      r = 1.0; g = 1.0; b = 0.0;
    } else if (face.hover) {
      r = 0.8; g = 0.4; b = 0.0;
    } else {
      r = 0.2; g = 0.2; b = 0.2;
    }

    add(f, faceVertices[0].position);
    add(f, faceVertices[1].position);
    add(f, faceVertices[2].position);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.faces_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, f, goog.webgl.STATIC_DRAW);

  // Create mesh for rendering all the edges.
  this.edgeCount_ = this.object_.edges.length * 2;
  k = 0;
  var e = new Float32Array(this.edgeCount_ * 48);
  goog.array.forEach(this.object_.edges, function(edge) {
    if (edge.selected) {
      r = 1.0; g = 1.0; b = 0.0;
    } else if (edge.hover) {
      r = 0.8; g = 0.4; b = 0.0;
    } else {
      r = 1.0; g = 1.0; b = 1.0;
    }

    add(e, this.object_.vertices[edge.start].position);
    add(e, this.object_.vertices[edge.end].position);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.edges_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, e, goog.webgl.STATIC_DRAW);

  // Create mesh for rendering all the edges.
  this.vertCount_ = this.object_.vertices.length * 2;
  k = 0;
  var v = new Float32Array(this.vertCount_ * 48);
  goog.array.forEach(this.object_.vertices, function(vert) {
    if (vert.selected) {
      r = 1.0; g = 1.0; b = 0.0;
    } else if (vert.hover) {
      r = 0.8; g = 0.4; b = 0.0;
    } else {
      r = 0.0; g = 0.0; b = 1.0;
    }

    add(v, vert.position);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.verts_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, v, goog.webgl.STATIC_DRAW);
};


/**
 * Destroys a mesh.
 */
shapy.editor.Mesh.prototype.free = function() {
  if (this.faces_) {
    this.gl_.deleteBuffer(this.faces_);
    this.faces_ = null;
  }
  if (this.edges_) {
    this.gl_.deleteBuffer(this.edges_);
    this.edges_ = null;
  }
  if (this.verts_) {
    this.gl_.deleteBuffer(this.verts_);
    this.verts_ = null;
  }
};


/**
 * Renders the mesh.
 *
 * @param {!shapy.editor.Shader} sh Shader program.
 */
shapy.editor.Mesh.prototype.render = function(sh) {
  this.gl_.enableVertexAttribArray(0);
  this.gl_.enableVertexAttribArray(3);

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.faces_);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 48, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 48, 32);
  this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, this.faceCount_);

  this.gl_.lineWidth(2.0);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.edges_);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 48, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 48, 32);
  this.gl_.drawArrays(goog.webgl.LINES, 0, this.edgeCount_);

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.verts_);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 48, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 48, 32);
  this.gl_.drawArrays(goog.webgl.POINTS, 0, this.vertCount_);

  this.gl_.disableVertexAttribArray(3);
  this.gl_.disableVertexAttribArray(0);
};
