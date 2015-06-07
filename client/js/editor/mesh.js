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

  /** @private {!WebGLBuffer} @const */
  this.uvs_ = this.gl_.createBuffer();
  this.uvCount_ = 0;

  /** @private {!WebGLBuffer} @const */
  this.uvEdges_ = this.gl_.createBuffer();
  this.uvEdgeCount_ = 0;

  /** @private {!WebGLBuffer} @const */
  this.uvFaces_ = this.gl_.createBuffer();
  this.uvFaceCount_ = 0;

  this.build_();
};


/**
 * Builds the mesh.
 *
 * @private
 */
shapy.editor.Mesh.prototype.build_ = function() {
  var r = 0, g = 0, b = 0, a = 1;
  var zero = goog.vec.Vec2.createFloat32FromValues(0, 0);

  var add = function(d, pos, uv) {
    d[k++] = pos[0]; d[k++] = pos[1]; d[k++] = pos[2];    // Position.
    d[k++] = 0; d[k++] = 0; d[k++] = 0;                   // Normal.
    d[k++] = uv[0]; d[k++] = uv[1];                       // UV.
    d[k++] = r; d[k++] = g; d[k++] = b; d[k++] = 1;       // Diffuse.
  };

  var addUV = function(d, pos) {
    d[k++] = (pos.u * 2 - 1) * shapy.editor.Viewport.UV.SIZE;
    d[k++] = (pos.v * 2 - 1) * shapy.editor.Viewport.UV.SIZE;
    d[k++] = r; d[k++] = g; d[k++] = b; d[k++] = a;
  };

  // Create mesh for rendering all the edges.
  this.vertCount_ = 0;
  goog.object.forEach(this.object_.verts, function() {
      this.vertCount_ += 1;
  }, this);
  k = 0;
  var v = new Float32Array(this.vertCount_ * 48);
  goog.object.forEach(this.object_.verts, function(vert) {
    if (vert.selected) {
      r = 0.9; g = 0.9; b = 0.0;
    } else {
      r = 0.0; g = 0.0; b = 0.4;
    }
    if (vert.hover) {
      r *= 1.2; g *= 1.2; b *= 1.5;
    }

    add(v, vert.position, zero);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.verts_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, v, goog.webgl.STATIC_DRAW);

  // Create mesh for rendering all the edges.
  this.edgeCount_ = 0;
  goog.object.forEach(this.object_.edges, function() {
      this.edgeCount_ += 2;
  }, this);
  k = 0;
  var e = new Float32Array(this.edgeCount_ * 48);
  goog.object.forEach(this.object_.edges, function(edge) {
    var v = edge.getVertices();
    if (edge.selected || v[0].selected) {
      r = 0.9; g = 0.9; b = 0.0;
    } else {
      r = 0.8; g = 0.8; b = 1.0;
    }
    if (edge.hover) {
      r *= 1.2; g *= 1.2; b *= 1.2;
    }
    add(e, v[0].position, zero);
    if (edge.selected || v[1].selected) {
      r = 0.9; g = 0.9; b = 0.0;
    } else {
      r = 0.8; g = 0.8; b = 1.0;
    }

    if (edge.hover) {
      r *= 1.2; g *= 1.2; b *= 1.2;
    }
    add(e, v[1].position, zero);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.edges_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, e, goog.webgl.STATIC_DRAW);

  // Create mesh for rendering all the faces.
  this.faceCount_ = 0;
  goog.object.forEach(this.object_.faces, function() {
      this.faceCount_ += 3;
  }, this);
  k = 0;
  var f = new Float32Array(this.faceCount_ * 48);
  goog.object.forEach(this.object_.faces, function(face) {
    var v = face.getVertices();
    if (face.selected) {
      r = 0.8; g = 0.8; b = 0.0;
    } else {
      if (this.object_.selected) {
        r = this.object_.selected.colour[0];
        g = this.object_.selected.colour[1];
        b = this.object_.selected.colour[2];
      } else {
        r = 0.4; g = 0.4; b = 0.4;
      }
      if (this.object_.hover) {
        r *= 1.2; g *= 1.2; b *= 1.2;
      }
    }
    if (face.hover) {
      r *= 1.2; g *= 1.2; b *= 1.2;
    }
    add(f, v[0].position, v[0].uv);
    add(f, v[1].position, v[1].uv);
    add(f, v[2].position, v[2].uv);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.faces_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, f, goog.webgl.STATIC_DRAW);

  // Create a mesh for rendering all UV points.
  this.uvCount_ = 0;
  goog.object.forEach(this.object_.uvs, function(uv) {
    this.uvCount_++;
  }, this);
  k = 0;
  var u = new Float32Array(this.uvCount_ * 24);
  goog.object.forEach(this.object_.uvs, function(uv) {
    if (uv.selected && uv.hover) {
      r = 1.0; g = 1.0; b = 0.0;
    } else if (uv.selected) {
      r = 0.0; g = 1.0; b = 1.0;
    } else if (uv.hover) {
      r = 0.0; g = 0.0; b = 1.0;
    } else {
      r = 0.0; g = 1.0; b = 0.0;
    }
    addUV(u, uv);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvs_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, u, goog.webgl.STATIC_DRAW);

  // Create a mesh for rendering all UV edges & faces.
  this.uvEdgeCount_ = 0;
  this.uvFaceCount_ = 0;
  goog.object.forEach(this.object_.faces, function(face) {
    this.uvEdgeCount_ += 6;
    this.uvFaceCount_ += 3;
  }, this);
  k = 0;
  var e = new Float32Array(this.uvEdgeCount_ * 24);
  goog.object.forEach(this.object_.faces, function(face) {
    if (!face.uv0 || !face.uv1 || !face.uv2) {
      return;
    }

    r = 0.4; g = 0.4; b = 0.4; a = 1.0;
    addUV(e, this.object_.uvs[face.uv0]);
    addUV(e, this.object_.uvs[face.uv1]);
    addUV(e, this.object_.uvs[face.uv1]);
    addUV(e, this.object_.uvs[face.uv2]);
    addUV(e, this.object_.uvs[face.uv2]);
    addUV(e, this.object_.uvs[face.uv0]);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvEdges_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, e, goog.webgl.STATIC_DRAW);

  k = 0;
  var f = new Float32Array(this.uvFaceCount_ * 24);
  goog.object.forEach(this.object_.faces, function(face) {
    if (!face.uv0 || !face.uv1 || !face.uv2) {
      return;
    }

    r = 0.7; g = 0.7; b = 0.7; a = 0.4;
    addUV(f, this.object_.uvs[face.uv0]);
    addUV(f, this.object_.uvs[face.uv1]);
    addUV(f, this.object_.uvs[face.uv2]);
  }, this);

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvFaces_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, f, goog.webgl.STATIC_DRAW);
};


/**
 * Destroys a mesh.
 */
shapy.editor.Mesh.prototype.destroy = function() {
  if (this.faces_) {
    this.gl_.deleteBuffer(this.faces_);
    this.faces_ = null;
  }
  if (this.edges_) {
    this.gl_.deleteBuffer(this.edges_);
    this.edges_ = null;
  }
  if (this.vertices_) {
    this.gl_.deleteBuffer(this.vertices_);
    this.vertices_ = null;
  }
  if (this.uvs_) {
    this.gl_.deleteBuffer(this.uvs_);
    this.uvs_ = null;
  }
  if (this.uvEdges_) {
    this.gl_.deleteBuffer(this.uvEdges_);
    this.uvEdges_ = null;
  }
  if (this.uvFaces_) {
    this.gl_.deleteBuffer(this.uvFaces_);
    this.uvFaces_ = null;
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

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.verts_);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 48, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 48, 32);
  this.gl_.drawArrays(goog.webgl.POINTS, 0, this.vertCount_);

  this.gl_.lineWidth(2.0);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.edges_);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 48, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 48, 32);
  this.gl_.drawArrays(goog.webgl.LINES, 0, this.edgeCount_);

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.faces_);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 48, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 48, 32);
  this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, this.faceCount_);

  this.gl_.disableVertexAttribArray(3);
  this.gl_.disableVertexAttribArray(0);
};


/**
 * Renders all UV components.
 */
shapy.editor.Mesh.prototype.renderUV = function() {
  this.gl_.enableVertexAttribArray(0);
  this.gl_.enableVertexAttribArray(3);


  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvFaces_);
  this.gl_.vertexAttribPointer(0, 2, goog.webgl.FLOAT, false, 24, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 24, 8);
  this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, this.uvFaceCount_);

  this.gl_.lineWidth(2.0);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvEdges_);
  this.gl_.vertexAttribPointer(0, 2, goog.webgl.FLOAT, false, 24, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 24, 8);
  this.gl_.drawArrays(goog.webgl.LINES, 0, this.uvEdgeCount_);

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvs_);
  this.gl_.vertexAttribPointer(0, 2, goog.webgl.FLOAT, false, 24, 0);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 24, 8);
  this.gl_.drawArrays(goog.webgl.POINTS, 0, this.uvCount_);

  this.gl_.disableVertexAttribArray(3);
  this.gl_.disableVertexAttribArray(0);
};
