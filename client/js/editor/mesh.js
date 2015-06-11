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
  this.verts_ = this.gl_.createBuffer();
  /** @private {number} @const */
  this.vertCount_ = 0;
  /** @private {!WebGLBuffer} @const */
  this.edges_ = this.gl_.createBuffer();
  /** @private {number} @const */
  this.edgeCount_ = 0;
  /** @private {!WebGLBuffer} @const */
  this.faces_ = this.gl_.createBuffer();
  /** @private {number} @const */
  this.faceCount_ = 0;

  /** @private {!WebGLBuffer} @const */
  this.uvs_ = this.gl_.createBuffer();
  this.uvPointCount_ = 0;
  /** @private {!WebGLBuffer} @const */
  this.uvEdges_ = this.gl_.createBuffer();
  this.uvEdgeCount_ = 0;
  /** @private {!WebGLBuffer} @const */
  this.uvFaces_ = this.gl_.createBuffer();
  this.uvFaceCount_ = 0;

  // Upload the meshes & UVs.
  this.buildMesh_();
  this.buildUV_();
};


/**
 * Colours for different entities.
 *
 * 3 - selected & hover
 * 2 - selected
 * 1 - hover
 * 0 - none
 */
shapy.editor.Mesh.COLOUR = {
  'vert': {
    0: [0.0, 0.0, 1.0],
    1: [1.0, 0.4, 0.0],
    2: [1.0, 0.6, 0.0],
    3: [1.0, 1.0, 0.0],
  },
  'edge': {
    0: [0.4, 0.7, 1.0],
    1: [1.0, 0.4, 0.0],
    2: [1.0, 0.6, 0.0],
    3: [1.0, 1.0, 0.0],
  },
  'face': {
    0: [0.5, 0.5, 0.5],
    1: [1.0, 0.4, 0.0],
    2: [1.0, 0.6, 0.0],
    3: [1.0, 1.0, 0.0],
  },

  'uv_point': {
    0: [0.0, 0.0, 1.0],
    1: [1.0, 0.4, 0.0],
    2: [1.0, 0.6, 0.0],
    3: [1.0, 1.0, 0.0],
  },
  'uv_edge': {
    0: [0.4, 0.7, 1.0],
    1: [1.0, 0.4, 0.0],
    2: [1.0, 0.6, 0.0],
    3: [1.0, 1.0, 0.0],
  },
  'uv_face': {
    0: [0.5, 0.5, 0.5],
    1: [1.0, 0.4, 0.0],
    2: [1.0, 0.6, 0.0],
    3: [1.0, 1.0, 0.0],
  }
};


/**
 * Builds the mesh.
 *
 * @private
 */
shapy.editor.Mesh.prototype.buildMesh_ = function() {
  var k, d;

  // Count the number of items in the mesh.
  this.vertCount_ = 0;
  this.edgeCount_ = 0;
  this.faceCount_ = 0;

  goog.object.forEach(this.object_.verts, function() {
      this.vertCount_ += 1;
  }, this);
  goog.object.forEach(this.object_.edges, function() {
      this.edgeCount_ += 2;
  }, this);
  goog.object.forEach(this.object_.faces, function() {
      this.faceCount_ += 3;
  }, this);

  // Adds a point into the buffer.
  var add = function(pos, uv, type, sel, hover, def) {
    // Position.
    d[k++] = pos[0];
    d[k++] = pos[1];
    d[k++] = pos[2];

    // Normal.
    d[k++] = 0;
    d[k++] = 0;
    d[k++] = 0;

    // UV.
    if (uv) {
      d[k++] = uv.u;
      d[k++] = uv.v;
    } else {
      d[k++] = 0.0;
      d[k++] = 0.0;
    }

    // Colour.
    var mask = (sel ? 2 : 0) | (hover ? 1 : 0);
    var colour = shapy.editor.Mesh.COLOUR[type][mask];
    if (!mask && def) {
      colour = def;
    }

    d[k++] = colour[0];
    d[k++] = colour[1];
    d[k++] = colour[2];
    d[k++] = 1;
  };

  // Create mesh for rendering all the edges.
  k = 0; d = new Float32Array(this.vertCount_ * 48);
  goog.object.forEach(this.object_.verts, function(vert) {
    add(vert.position, null, 'vert', vert.selected, vert.hover);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.verts_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);

  // Create mesh for rendering all the edges.
  k = 0; d = new Float32Array(this.edgeCount_ * 48);
  goog.object.forEach(this.object_.edges, function(edge) {
    goog.array.forEach(edge.getVertices(), function(v) {
      add(v.position, null, 'edge', edge.selected || v.selected, edge.hover);
    }, this);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.edges_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);

  // Create mesh for rendering all the faces.
  k = 0; d = new Float32Array(this.faceCount_ * 48);
  goog.object.forEach(this.object_.faces, function(face) {
    var v = face.getVertices();
    var uvs = face.getUVs();

    add(v[0].position, uvs[0],
        'face', face.selected, face.hover, this.object_.selected.colour);
    add(v[1].position, uvs[1],
        'face', face.selected, face.hover, this.object_.selected.colour);
    add(v[2].position, uvs[2],
        'face', face.selected, face.hover, this.object_.selected.colour);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.faces_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Builds the UV mesh.
 *
 * @private
 */
shapy.editor.Mesh.prototype.buildUV_ = function() {
  var k, d;

  // Count the number of uv points, edges and faces.
  this.uvPointCount_ = 0;
  this.uvEdgeCount_ = 0;
  this.uvFaceCount_ = 0;

  goog.object.forEach(this.object_.uvPoints, function(uv) {
    this.uvPointCount_ += 1;
  }, this);
  goog.object.forEach(this.object_.uvEdges, function(edge) {
    this.uvEdgeCount_ += 2;
  }, this);
  goog.object.forEach(this.object_.faces, function(face) {
    this.uvFaceCount_ += 3;
  }, this);

  // Adds a uv point to the buffer.
  var addUV = function(pos, type, sel, hover, a) {
    d[k++] = (pos.u * 2 - 1) * shapy.editor.Viewport.UV.SIZE;
    d[k++] = (pos.v * 2 - 1) * shapy.editor.Viewport.UV.SIZE;

    // Colour.
    var mask = (sel ? 2 : 0) | (hover ? 1 : 0);
    var colour = shapy.editor.Mesh.COLOUR[type][mask];
    d[k++] = colour[0];
    d[k++] = colour[1];
    d[k++] = colour[2];
    d[k++] = a;
  };

  // Create a mesh for rendering all UV points.
  k = 0; d = new Float32Array(this.uvPointCount_ * 24);
  goog.object.forEach(this.object_.uvPoints, function(uv) {
    addUV(uv, 'uv_point', uv.selected, uv.hover, 1.0);
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvs_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);

  // Create a mesh for rendering all UV edges.
  k = 0; d = new Float32Array(this.uvEdgeCount_ * 24);
  goog.object.forEach(this.object_.uvEdges, function(edge) {
    goog.array.forEach(edge.getUVs(), function(uv) {
      addUV(uv, 'uv_edge', uv.selected || edge.selected, edge.hover, 1.0);
    });
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvEdges_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);

  // Create a mesh for rendering all UV faces.
  k = 0; d = new Float32Array(this.uvFaceCount_ * 24);
  goog.object.forEach(this.object_.faces, function(face) {
    goog.array.forEach(face.getUVs(), function(uv) {
      addUV(uv, 'uv_face', face.selected, face.hover, 0.5);
    });
  }, this);
  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.uvFaces_);
  this.gl_.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
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
 * Renders the points and edges.
 *
 * @param {!shapy.editor.Shader} sh Shader program
 */
shapy.editor.Mesh.prototype.renderPointsEdges = function(sh) {
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

  this.gl_.disableVertexAttribArray(3);
  this.gl_.disableVertexAttribArray(0);
};


/**
 * Renders the mesh.
 *
 * @param {!shapy.editor.Shader} sh Shader program
 */
shapy.editor.Mesh.prototype.render = function(sh) {
  this.gl_.enableVertexAttribArray(0);
  this.gl_.enableVertexAttribArray(2);
  this.gl_.enableVertexAttribArray(3);

  this.gl_.bindBuffer(goog.webgl.ARRAY_BUFFER, this.faces_);
  this.gl_.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 48, 0);
  this.gl_.vertexAttribPointer(2, 2, goog.webgl.FLOAT, false, 48, 24);
  this.gl_.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 48, 32);
  this.gl_.drawArrays(goog.webgl.TRIANGLES, 0, this.faceCount_);

  this.gl_.disableVertexAttribArray(3);
  this.gl_.disableVertexAttribArray(2);
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
  this.gl_.drawArrays(goog.webgl.POINTS, 0, this.uvPointCount_);

  this.gl_.disableVertexAttribArray(3);
  this.gl_.disableVertexAttribArray(0);
};
