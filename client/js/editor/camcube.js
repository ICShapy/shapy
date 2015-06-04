// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.CamCube');

goog.require('goog.vec.Vec3');
goog.require('shapy.editor.geom');



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
  this.invView = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4.Type} @const */
  this.proj = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4.Type} @const */
  this.invProj = goog.vec.Mat4.createFloat32();
  /** @public {!goog.vec.Mat4.Type} @const */
  this.vp = goog.vec.Mat4.createFloat32();

  /** @private {!goog.vec.Vec3.Type} @const */
  this.pos_ = goog.vec.Vec3.createFloat32();
  /** @private {!WebGLBuffer} */
  this.mesh_ = null;
  /** @private {!goog.vec.Vec3.Type} @const */
  this.hover_ = null;
  /** @private {boolean} @const */
  this.click_ = false;
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
 * List of faces and their normals.
 */
shapy.editor.CamCube.NORMALS = [
    [0, 0, +1],
    [0, 0, -1],
    [+1, 0, 0],
    [-1, 0, 0],
    [0, +1, 0],
    [0, -1, 0],
];


/**
 * Information used to render faces.
 * @type {!Array<string>}
 */
shapy.editor.CamCube.NORMALS = [
  // Front.
  [-1, -1, +1], [-1, +0, +1], [-1, +1, +1],
  [+0, -1, +1], [+0, +0, +1], [+0, +1, +1],
  [+1, -1, +1], [+1, +0, +1], [+1, +1, +1],
  // Back.
  [-1, -1, -1], [-1, +0, -1], [-1, +1, -1],
  [+0, -1, -1], [+0, +0, -1], [+0, +1, -1],
  [+1, -1, -1], [+1, +0, -1], [+1, +1, -1],
  // Right.
  [+1, -1, -1], [+1, -1, +0], [+1, -1, +1],
  [+1, +0, -1], [+1, +0, +0], [+1, +0, +1],
  [+1, +1, -1], [+1, +1, +0], [+1, +1, +1],
  // Left.
  [-1, -1, -1], [-1, -1, +0], [-1, -1, +1],
  [-1, +0, -1], [-1, +0, +0], [-1, +0, +1],
  [-1, +1, -1], [-1, +1, +0], [-1, +1, +1],
  // Top.
  [-1, +1, -1], [-1, +1, +0], [-1, +1, +1],
  [+0, +1, -1], [+0, +1, +0], [+0, +1, +1],
  [+1, +1, -1], [+1, +1, +0], [+1, +1, +1],
  // Bottom.
  [-1, -1, -1], [-1, -1, +0], [-1, -1, +1],
  [+0, -1, -1], [+0, -1, +0], [+0, -1, +1],
  [+1, -1, -1], [+1, -1, +0], [+1, -1, +1],
];


/**
 * Size of the center region.
 */
shapy.editor.CamCube.CENTER = 0.6;


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
 * Clears buffers.
 */
shapy.editor.CamCube.prototype.destroy = function() {
  this.mesh_ = null;
};


/**
 * Updates the matrices.
 */
shapy.editor.CamCube.prototype.compute = function() {
  var size = shapy.editor.CamCube.DISTANCE * 0.5;

  // Update the camera reference.
  this.camera_ = this.viewport_.camera;

  // Compute the camera position based on the tracked camera.
  goog.vec.Vec3.subtract(this.camera_.eye, this.camera_.center, this.pos_);
  goog.vec.Vec3.normalize(this.pos_, this.pos_);
  goog.vec.Vec3.scale(this.pos_, shapy.editor.CamCube.DISTANCE, this.pos_);

  // Compute cube projection matrix based on the camera's mode.
  switch (this.camera_.constructor) {
    case shapy.editor.Camera.Persp: {
      goog.vec.Mat4.makePerspective(this.proj, 45.0, 1.0, 0.1, 100);
      break;
    }
    case shapy.editor.Camera.Ortho: {
      goog.vec.Mat4.makeOrtho(this.proj, -size, size, -size, size, 0.1, 100);
      break;
    }
    default: {
      throw new Error('Invalid camera type.');
    }
  }

  // Compute view and vp matrices.
  goog.vec.Mat4.makeLookAt(this.view, this.pos_, [0, 1, 0], this.camera_.up);
  goog.vec.Mat4.multMat(this.proj, this.view, this.vp);
  goog.vec.Mat4.invert(this.proj, this.invProj);
  goog.vec.Mat4.invert(this.view, this.invView);
};


/**
 * Builds the cube mesh.
 *
 * @private
 *
 * @param {WebGLShader} gl
 */
shapy.editor.CamCube.prototype.build_ = function(gl) {
  var d = new Float32Array(5 * 6 * 9 * 6), k = 0, tw, to;
  var s = shapy.editor.CamCube.CENTER, t = 1 - s;
  var u =

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);

  tw = 1.0 / 6.0;
  to = 0.0;

  var emitQuad = function(x0, y0, x1, y1, emit, order) {
    emit(x0, y0);
    if (order) {
      emit(x1, y1); emit(x1, y0);
    } else {
      emit(x1, y0); emit(x1, y1);
    }
    emit(x0, y0);
    if (order) {
      emit(x0, y1); emit(x1, y1);
    } else {
      emit(x1, y1); emit(x0, y1);
    }
  };

  var emitFace = function(emit, order) {
    emitQuad(-1, -1, -s, -s, emit, order);
    emitQuad(-1, -s, -s, +s, emit, order);
    emitQuad(-1, +s, -s, +1, emit, order);
    emitQuad(-s, -1, +s, -s, emit, order);
    emitQuad(-s, -s, +s, +s, emit, order);
    emitQuad(-s, +s, +s, +1, emit, order);
    emitQuad(+s, -1, +1, -s, emit, order);
    emitQuad(+s, -s, +1, +s, emit, order);
    emitQuad(+s, +s, +1, +1, emit, order);
  };

  emitFace(function(x, y) {
    d[k++] = x; d[k++] = y; d[k++] = +1;
    d[k++] = (x + 1) / 12.0 + 0.0 / 6.0;
    d[k++] = (1 - y) / 2.0;
  }, true);
  emitFace(function(x, y) {
    d[k++] = x; d[k++] = y; d[k++] = -1;
    d[k++] = (1 - x) / 12.0 + 1.0 / 6.0;
    d[k++] = (1 - y) / 2.0;
  }, false);
  emitFace(function(x, y) {
    d[k++] = +1; d[k++] = x; d[k++] = y;
    d[k++] = (1 - y) / 12.0 + 2.0 / 6.0;
    d[k++] = (1 - x) / 2.0;
  }, true);
  emitFace(function(x, y) {
    d[k++] = -1; d[k++] = x; d[k++] = y;
    d[k++] = (1 + y) / 12.0 + 3.0 / 6.0;
    d[k++] = (1 - x) / 2.0;
  }, false);
  emitFace(function(x, y) {
    d[k++] = x; d[k++] = +1; d[k++] = y;
    d[k++] = (x + 1) / 12.0 + 4.0 / 6.0;
    d[k++] = (y + 1) / 2.0;
  }, false);
  emitFace(function(x, y) {
    d[k++] = x; d[k++] = -1; d[k++] = y;
    d[k++] = (x + 1) / 12.0 + 5.0 / 6.0;
    d[k++] = (1 - y) / 2.0;
  }, true);


  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
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

  var idx = 0;
  goog.array.forEach(shapy.editor.CamCube.NORMALS, function(normal) {
    var n = goog.vec.Vec3.cloneFloat32(normal);
    goog.vec.Vec3.normalize(n, n);

    if (this.hover_ && goog.vec.Vec3.distance(n, this.hover_) < 0.1) {
      if (this.click_) {
        sh.uniform4f('u_colour', 1, 1, 0, 1);
      } else {
        sh.uniform4f('u_colour', 1, 1, 1, 1);
      }
    } else {
      sh.uniform4f('u_colour', 0.7, 0.7, 0.7, 1);
    }

    gl.drawArrays(goog.webgl.TRIANGLES, idx, 6);
    idx += 6;
  }, this);

  gl.disable(goog.webgl.CULL_FACE);

  gl.disableVertexAttribArray(2);
  gl.disableVertexAttribArray(0);
};


/**
 * Finds the ray inside the cube viewports.
 *
 * @private
 *
 * @param {number} x
 * @param {number} y
 *
 * @return {!goog.vec.Ray}
 */
shapy.editor.CamCube.prototype.raycast_ = function(x, y) {
  x = 2.0 * x / this.size - 1.0;
  y = 2.0 * y / this.size - 1.0;

  var x0 = goog.vec.Vec4.createFloat32FromValues(x, y, -1, 1);
  goog.vec.Mat4.multVec4(this.invProj, x0, x0);
  goog.vec.Vec4.scale(x0, 1.0 / x0[3], x0);
  goog.vec.Mat4.multVec4(this.invView, x0, x0);

  var x1 = goog.vec.Vec4.createFloat32FromValues(x, y, +1, 1);
  goog.vec.Mat4.multVec4(this.invProj, x1, x1);
  goog.vec.Vec4.scale(x1, 1.0 / x1[3], x1);
  goog.vec.Mat4.multVec4(this.invView, x1, x1);

  var dir = goog.vec.Vec4.createFloat32();
  goog.vec.Vec3.subtract(x1, x0, dir);
  goog.vec.Vec3.normalize(dir, dir);

  return new goog.vec.Ray(x0, dir);
};


/**
 * Picks the faces which was clicked.
 *
 * @private
 *
 * @param {goog.vec.Ray} ray
 *
 * @return {string}
 */
shapy.editor.CamCube.prototype.getFace_ = function(ray) {
  var hits, dx, dy;

  // Find out which face was hit by the ray.
  hits = goog.array.map(shapy.editor.CamCube.NORMALS, function(normal) {
    return shapy.editor.geom.intersectPlane(ray, normal, normal);
  });
  hits = goog.array.filter(hits, function(h) {
    return -1 <= h[0] && h[0] <= 1 &&
        -1 <= h[1] && h[1] <= 1 &&
        -1 <= h[2] && h[2] <= 1;
  });
  goog.array.sort(hits, goog.bind(function(h0, h1) {
    return goog.vec.Vec3.distance(this.pos_, h0) -
        goog.vec.Vec3.distance(this.pos_, h1);
  }, this));

  if (goog.array.isEmpty(hits)) {
    return null;
  }
  var h = hits[0], dir, b, c;

  // Get the coordinate system of the face - dir is the normal, b points to the
  // left and c points upwards. Theese coordinates are then used to find
  // a normal vector which will orient the camera.
  if (Math.abs(h[0] - 1) <= 0.01) {
    dir = [+1, 0, 0]; b = [0, +1, 0]; c = [0, 0, +1];
    dx = h[1]; dy = h[2];
  } else if (Math.abs(h[0] + 1) <= 0.01) {
    dir = [-1, 0, 0]; b = [0, +1, 0]; c = [0, 0, +1];
    dx = h[1]; dy = h[2];
  } else if (Math.abs(h[1] - 1) <= 0.01) {
    dir = [0, +1, 0.001]; b = [+1, 0, 0]; c = [0, 0, +1];
    dx = h[0]; dy = h[2];
  } else if (Math.abs(h[1] + 1) <= 0.01) {
    dir = [0, -1, 0.001]; b = [+1, 0, 0]; c = [0, 0, +1];
    dx = h[0]; dy = h[2];
  } else if (Math.abs(h[2] - 1) <= 0.01) {
    dir = [0, 0, +1]; b = [+1, 0, 0]; c = [0, +1, 0];
    dx = h[0]; dy = h[1];
  } else if (Math.abs(h[2] + 1) <= 0.01) {
    dir = [0, 0, -1]; b = [+1, 0, 0]; c = [0, +1, 0];
    dx = h[0]; dy = h[1];
  } else {
    return null;
  }

  if (dx < -shapy.editor.CamCube.CENTER) {
    goog.vec.Vec3.subtract(dir, b, dir);
  }
  if (dx > shapy.editor.CamCube.CENTER) {
    goog.vec.Vec3.add(dir, b, dir);
  }

  if (dy < -shapy.editor.CamCube.CENTER) {
    goog.vec.Vec3.subtract(dir, c, dir);
  }
  if (dy > shapy.editor.CamCube.CENTER) {
    goog.vec.Vec3.add(dir, c, dir);
  }

  goog.vec.Vec3.normalize(dir, dir);
  return dir;
};


/**
 * Handles a mouse movement event.
 *
 * @param {number} x
 * @param {number} y
 *
 * @return {boolean} True if the event was hijacked.
 */
shapy.editor.CamCube.prototype.mouseMove = function(x, y) {
  y = this.size - (this.viewport_.rect.h - y);
  if (x > this.size || y < 0) {
    this.hover_ = null;
    this.click_ = false;
    return false;
  }

  var old = this.hover_;
  this.hover_ = this.getFace_(this.raycast_(x, y));
  if (!this.hover_) {
    this.hover_ = null;
    this.click_ = false;
    return false;
  }

  if (old && !goog.vec.Vec3.equals(this.hover_, old)) {
    this.click_ = false;
  }
  return true;
};


/**
 * Handles a mouse press event.
 *
 * @param {number} x
 * @param {number} y
 *
 * @return {boolean} True if the event was hijacked.
 */
shapy.editor.CamCube.prototype.mouseDown = function(x, y) {
  y = this.size - (this.viewport_.rect.h - y);
  if (x > this.size || y < 0) {
    this.hover_ = null;
    this.click_ = false;
    return false;
  }
  this.hover_ = this.getFace_(this.raycast_(x, y));
  if (!this.hover_) {
    this.click_ = false;
    return false;
  }

  this.click_ = this.hover_ != null;
  return this.click_;
};


/** @type {number} @const */
shapy.editor.CamCube.DISTANCE = 5.0;


/**
 * Handles a mouse release event.
 *
 * @param {number} x
 * @param {number} y
 *
 * @return {boolean} True if the event was hijacked.
 */
shapy.editor.CamCube.prototype.mouseUp = function(x, y) {
  if (!this.click_ || !this.hover_) {
    return false;
  }

  var n = goog.vec.Vec3.cloneFloat32(this.hover_);
  goog.vec.Vec3.scale(n, shapy.editor.CamCube.DISTANCE, n);
  goog.vec.Vec3.add(this.camera_.center, n, this.camera_.eye);

  this.click_ = false;
  this.hover_ = this.getFace_(this.raycast_(x, y));

  return true;
};
