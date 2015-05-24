// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.CamCube');



/**
 * Cube displayed in the corner of all viewports that controls the camera.
 *
 * TODO(nandor): Have a single instance of this.
 *
 * @constructor
 *
 * @param {!shapy.editor.Viewport} viewport
 * @param {!shapy.editor.Camera}   camera
 */
shapy.editor.CamCube = function(viewport, camera) {
  /** @private {!shapy.editor.Viewport} @const */
  this.viewport_ = viewport;
  /** @private {!shapy.editor.Camera} @const*/
  this.camera_ = camera;

  /** @public {number} */
  this.size = 0;

  /** @public {!goog.vec.Mat4.Type} @const */
  this.view = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4.Type} @const */
  this.proj = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4.Type} @const */
  this.vp = goog.vec.Mat4.createFloat32();

  /** @private {!goog.vec.Vec3.Type} @const */
  this.pos_ = goog.vec.Vec3.createFloat32();

  /** @private {!WebGLBuffer} */
  this.mesh_ = null;
};


/**
 * @type {number} @const
 */
shapy.editor.CamCube.SIZE = 120;

/**
 * @type {number} @const
 */
shapy.editor.CamCube.DISTANCE = 5;


/**
 * Resizes the viewport.
 *
 * @param {number} w
 * @param {number} h
 */
shapy.editor.CamCube.prototype.resize = function(w, h) {
  this.size = Math.min(Math.min(w / 3, h), shapy.editor.CamCube.SIZE);
};


/**
 * Updates the matrices.
 */
shapy.editor.CamCube.prototype.compute = function() {
  var size = shapy.editor.CamCube.DISTANCE * 0.5;

  // Compute the camera position based on the tracked camera.
  goog.vec.Vec3.subtract(this.camera_.eye, this.camera_.center, this.pos_);
  goog.vec.Vec3.normalize(this.pos_, this.pos_);
  goog.vec.Vec3.scale(this.pos_, shapy.editor.CamCube.DISTANCE, this.pos_);

  // Compute cube projection matrix based on the camera's mode.
  if (this.viewport_.type == shapy.editor.Viewport.Type.PERSPECTIVE) {
    goog.vec.Mat4.makePerspective(this.proj, 45.0, 1.0, 0.1, 100);
  } else {
    goog.vec.Mat4.makeOrtho(this.proj, -size, size, -size, size, 0.1, 100);
  }

  // Compute view and vp matrices.
  goog.vec.Mat4.makeLookAt(this.view, this.pos_, [0, 0, 0], this.camera_.up);
  goog.vec.Mat4.multMat(this.proj, this.view, this.vp);
};


/**
 * Builds the cube mesh.
 *
 * @private
 *
 * @param {WebGLShader} gl
 */
shapy.editor.CamCube.prototype.build_ = function(gl) {
  var data = new Float32Array(6 * 8 * 6 * 5), k = 0, tw = 1.0 / 6.0;

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);

  // Front Center
  data[k++] = -0.8; data[k++] = -0.8; data[k++] = 1.0;
  data[k++] = 0.2 * 1 * tw; data[k++] = 0.8;
  data[k++] = +0.8; data[k++] = +0.8; data[k++] = 1.0;
  data[k++] = 0.8 * 1 * tw; data[k++] = 0.2;
  data[k++] = +0.8; data[k++] = -0.8; data[k++] = 1.0;
  data[k++] = 0.8 * 1 * tw; data[k++] = 0.8;

  data[k++] = -0.8; data[k++] = -0.8; data[k++] = 1.0;
  data[k++] = 0.2 * 1 * tw; data[k++] = 0.8;
  data[k++] = -0.8; data[k++] = +0.8; data[k++] = 1.0;
  data[k++] = 0.2 * 1 * tw; data[k++] = 0.2;
  data[k++] = +0.8; data[k++] = +0.8; data[k++] = 1.0;
  data[k++] = 0.8 * 1 * tw; data[k++] = 0.2;

  gl.bufferData(goog.webgl.ARRAY_BUFFER, data, goog.webgl.STATIC_DRAW);
};


/**
 * Renders the camera cube.
 *
 * @param {WebGLShader}         gl
 * @param {shapy.editor.Shader} sh
 */
shapy.editor.CamCube.prototype.render = function(gl, sh) {
  // Cache the mesh.
  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(2);

  gl.cullFace(goog.webgl.FRONT);
  gl.frontFace(goog.webgl.CCW);
  gl.enable(goog.webgl.CULL_FACE);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 20, 0);
  gl.vertexAttribPointer(2, 2, goog.webgl.FLOAT, false, 20, 12);
  gl.drawArrays(goog.webgl.TRIANGLES, 0, 6);

  gl.disable(goog.webgl.CULL_FACE);

  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(0);
};
