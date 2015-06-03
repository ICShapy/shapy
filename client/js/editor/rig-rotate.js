// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig.Rotate');

goog.require('shapy.editor.geom');
goog.require('shapy.editor.Rig');



/**
 * Rig used to alter rotation.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Rotate = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.ROTATE);
  /** @private {!goog.vec.Vec3.Type} */
  this.normal_ = goog.vec.Vec3.createFloat32();
  /** @private {!goog.vec.Vec3.Type} */
  this.cursor_ = goog.vec.Vec3.createFloat32();
  /** @private {!goog.vec.Vec3.Type} */
  this.initialAngle_ = 0.0;
  /** @private {number} */
  this.startAngle_ = 0.0;
  /** @private {number} */
  this.currentAngle_ = 0.0;
  /** @private {number} @const */
  this.lastAngle_ = 0.0;
};
goog.inherits(shapy.editor.Rig.Rotate, shapy.editor.Rig);


/** @type {number} @const */
shapy.editor.Rig.Rotate.SEGMENTS = 64;
/** @type {number} @const */
shapy.editor.Rig.Rotate.DISK =
    shapy.editor.Rig.Rotate.SEGMENTS *
    18;
/** @type {number} @const */
shapy.editor.Rig.Rotate.RADIUS = 0.03;



/**
 * Creates the mesh for the rig.
 *
 * @private
 *
 * @param {!WebGLContext}        gl WebGL context.
 */
shapy.editor.Rig.Rotate.prototype.build_ = function(gl) {
  var d = new Float32Array(shapy.editor.Rig.Rotate.DISK * 3);
  var dp = 2 * Math.PI / shapy.editor.Rig.Rotate.SEGMENTS;
  var k = 0;

  var emit = function(p, t) {
    d[k++] = Math.cos(p) * (1 + shapy.editor.Rig.Rotate.RADIUS * t);
    d[k++] = 0;
    d[k++] = Math.sin(p) * (1 + shapy.editor.Rig.Rotate.RADIUS * t);
  };

  for (var i = 0; i < shapy.editor.Rig.Rotate.SEGMENTS; ++i) {
    var p0 = (i + 0) * dp, p1 = (i + 1) * dp;
    emit(p0, -1);
    emit(p0, 1);
    emit(p1, 1);
    emit(p0, -1);
    emit(p1, 1);
    emit(p1, -1);
  }

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Rotate.prototype.render = function(gl, sh) {
  var i = shapy.editor.Rig.Rotate.DISK / 3;
  var pos = this.object.getPosition();

  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  // Y ring.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.y) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.y) {
    sh.uniform4f('u_colour', 0.2, 0.5, 1.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.0, 0.7, 1.0);
  }
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  // X ring.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  goog.vec.Mat4.rotateZ(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.x) {
    sh.uniform4f('u_colour', 1.0, 0.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.7, 0.0, 0.0, 1.0);
  }
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  // Z ring.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
  goog.vec.Mat4.rotateX(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.z) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.z) {
    sh.uniform4f('u_colour', 0.0, 1.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.7, 0.0, 1.0);
  }
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  // Cursor.
  if (this.select_.x || this.select_.y || this.select_.z) {
    var r = (1.0 - shapy.editor.Rig.Rotate.RADIUS);
    gl.lineWidth(2.0);
    goog.vec.Mat4.makeIdentity(this.model_);
    goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
    sh.uniformMat4x4('u_model', this.model_);

    var tmp = gl.createBuffer();
    gl.bindBuffer(goog.webgl.ARRAY_BUFFER, tmp);

    // Line to the cursor.
    gl.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
        pos[0], pos[1], pos[2],
        this.cursor_[0], this.cursor_[1], this.cursor_[2]
    ]), goog.webgl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

    goog.vec.Mat4.makeIdentity(this.model_);
    sh.uniformMat4x4('u_model', this.model_);
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
    gl.drawArrays(goog.webgl.LINES, 0, 2);

    // Start marker & triangle fan for shaded region.
    var seg = shapy.editor.Rig.Rotate.SEGMENTS;
    var data = new Float32Array(9 + (seg + 1) * 3);
    var k = 0;

    data[k++] = 0.0;
    data[k++] = 0.0;
    data[k++] = 0.0;

    if (this.select_.x) {
      data[k++] = 0.0;
      data[k++] = r * Math.cos(this.startAngle_);
      data[k++] = r * Math.sin(this.startAngle_);
    } else if (this.select_.y) {
      data[k++] = r * Math.sin(this.startAngle_);
      data[k++] = 0.0;
      data[k++] = r * Math.cos(this.startAngle_);
    } else {
      data[k++] = r * Math.cos(this.startAngle_);
      data[k++] = r * Math.sin(this.startAngle_);
      data[k++] = 0.0;
    }

    data[k++] = 0.0;
    data[k++] = 0.0;
    data[k++] = 0.0;

    var dp = (this.currentAngle_ - this.startAngle_) / seg;
    for (var i = 0; i <= seg + 1; ++i) {
      var p = this.startAngle_ + i * dp;
      if (this.select_.x) {
        data[k++] = 0.0;
        data[k++] = r * Math.cos(p);
        data[k++] = r * Math.sin(p);
      } else if (this.select_.y) {
        data[k++] = r * Math.sin(p);
        data[k++] = 0.0;
        data[k++] = r * Math.cos(p);
      } else {
        data[k++] = r * Math.cos(p);
        data[k++] = r * Math.sin(p);
        data[k++] = 0.0;
      }
    }

    goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
    goog.vec.Mat4.scale(this.model_, this.size_, this.size_, this.size_);
    sh.uniformMat4x4('u_model', this.model_);
    gl.bufferData(goog.webgl.ARRAY_BUFFER, data, goog.webgl.STREAM_DRAW);
    sh.uniform4f('u_colour', 0.0, 0.0, 0.0, 1.0);
    gl.drawArrays(goog.webgl.LINES, 0, 2);
    sh.uniform4f('u_colour', 0.2, 0.2, 0.2, 0.5);
    gl.drawArrays(goog.webgl.TRIANGLE_FAN, 2, 2 + seg);

    gl.bindBuffer(goog.webgl.ARRAY_BUFFER, null);
    gl.deleteBuffer(tmp);
  }

  gl.disableVertexAttribArray(0);
};


/**
 * Adjusts the cursor if it is inside the ring to touch the inner edge.
 *
 * @private
 *
 * @param {!goog.vec.Vec3.Type} cursor
 */
shapy.editor.Rig.Rotate.prototype.adjustCursor_ = function(cursor) {
  var d, r, pos = this.object.getPosition();

  // TODO(David): Wtf is happening here?!
  goog.vec.Vec3.subtract(cursor, pos, cursor);
  d = goog.vec.Vec3.magnitude(cursor);
  if (d < this.size_) {
    r = 1.0 - shapy.editor.Rig.Rotate.RADIUS;
    goog.vec.Vec3.scale(cursor, r / d * this.size_, cursor);
  }

  goog.vec.Vec3.add(pos, cursor, cursor);
};


/**
 * Returns the normal vector of the control ring that was hit by a plane.
 *
 * @private
 *
 * @param {!goog.vec.Ray} ray
 *
 * @return {goog.vec.Vec3.Type}
 */
shapy.editor.Rig.Rotate.prototype.getHit_ = function(ray) {
  var position = this.object.getPosition();

  // Find intersection point with planes.
  var ix = shapy.editor.geom.intersectPlane(ray, [1, 0, 0], position);
  var iy = shapy.editor.geom.intersectPlane(ray, [0, 1, 0], position);
  var iz = shapy.editor.geom.intersectPlane(ray, [0, 0, 1], position);

  // Find distance between center and intersection point.
  var cx = goog.vec.Vec3.distance(ix, position) / this.size_;
  var cy = goog.vec.Vec3.distance(iy, position) / this.size_;
  var cz = goog.vec.Vec3.distance(iz, position) / this.size_;

  // Find distance to intersection points.
  var ex = goog.vec.Vec3.distance(ix, ray.origin) / this.size_;
  var ey = goog.vec.Vec3.distance(iy, ray.origin) / this.size_;
  var ez = goog.vec.Vec3.distance(iz, ray.origin) / this.size_;

  // Choose the best match - closest to origin.
  var hits = [
      [[1, 0, 0], cx, ex, ix],
      [[0, 1, 0], cy, ey, iy],
      [[0, 0, 1], cz, ez, iz]
  ];
  hits = goog.array.filter(hits, function(e) {
    return Math.abs(e[1] - 1.0) < shapy.editor.Rig.Rotate.RADIUS;
  }, this);
  goog.array.sort(hits, function(e1, e2) { return e1[2] - e2[2]; }, this);

  // If no hits, return
  if (goog.array.isEmpty(hits)) {
    return null;
  }
  return hits[0];
};


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseMove = function(ray) {
  var pos = this.object.getPosition();
  if (this.select_.x || this.select_.y || this.select_.z) {
    this.cursor_ = shapy.editor.geom.intersectPlane(ray, this.normal_, pos);
    this.adjustCursor_(this.cursor_);
    this.lastAngle_ = this.currentAngle_;
    this.currentAngle_ = this.getAngle_(this.cursor_);

    if (this.select_.x) {
      this.object.rotate(
          this.currentAngle_, 0, 0,
          this.currentAngle_ - this.lastAngle_, 0, 0);
      return true;
    }
    if (this.select_.y) {
      this.object.rotate(
          0, this.currentAngle_, 0,
          0, this.currentAngle_ - this.lastAngle_, 0);
      return true;
    }
    if (this.select_.z) {
      this.object.rotate(
          0, 0, this.currentAngle_,
          0, 0, this.currentAngle_ - this.lastAngle_);
      return true;
    }
  }

  var hit = this.getHit_(ray);
  if (!hit) {
    this.hover_.x = this.hover_.y = this.hover_.z = false;
    return;
  }

  this.normal_ = hit[0];
  this.hover_.x = hit[0][0] != 0;
  this.hover_.y = hit[0][1] != 0;
  this.hover_.z = hit[0][2] != 0;

  return this.hover_.x || this.hover_.y || this.hover_.z;
};


/**
 * Returns the rotation angle.
 *
 * @private
 *
 * @param {goog.vec.Vec3.Type} cursor
 *
 * @return {number}
 */
shapy.editor.Rig.Rotate.prototype.getAngle_ = function(cursor) {
  var pos = this.object.getPosition();

  if (this.hover_.x) {
    return Math.atan2(
        this.cursor_[2] - pos[2],
        this.cursor_[1] - pos[1]);
  }
  if (this.hover_.y) {
    return Math.atan2(
        this.cursor_[0] - pos[0],
        this.cursor_[2] - pos[2]);
  }
  if (this.hover_.z) {
    return Math.atan2(
        this.cursor_[1] - pos[1],
        this.cursor_[0] - pos[0]);
  }
  return 0.0;
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 *
 * @return {boolean} True if event captured.
 */
shapy.editor.Rig.Rotate.prototype.mouseDown = function(ray) {
  var pos = this.object.getPosition();
  var hit = this.getHit_(ray);
  var dx, dy, angle;

  if (!hit) {
    return false;
  }

  this.cursor_ = shapy.editor.geom.intersectPlane(ray, this.normal_, pos);
  this.adjustCursor_(this.cursor_);
  this.currentAngle_ = this.getAngle_(this.cursor_);
  this.startAngle_ = this.currentAngle_;
  this.lastAngle_ = this.currentAngle_;
  angle = this.object.getRotation();

  if (this.hover_.x) {
    this.initialAngle_ = angle[0];
    this.select_.x = true;
    return true;
  }
  if (this.hover_.y) {
    this.initialAngle_ = angle[1];
    this.select_.y = true;
    return true;
  }
  if (this.hover_.z) {
    this.initialAngle_ = angle[2];
    this.select_.z = true;
    return true;
  }
  return true;
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseUp = function(ray) {
  var captured = this.select_.x || this.select_.x || this.select_.z;
  this.select_.x = this.select_.y = this.select_.z = false;
  return captured;
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Rotate.prototype.mouseLeave = function() {
  this.select_.x = this.select_.y = this.select_.z = false;
};
