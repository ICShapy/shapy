// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig');
goog.provide('shapy.editor.Rig.Rotate');
goog.provide('shapy.editor.Rig.Scale');
goog.provide('shapy.editor.Rig.Translate');



/**
 * Rigs are attached to objects in order to edit their properties.
 *
 * The user can move the rig around with the mouse, altering the translation,
 * position, scaling or rotation of an object.
 *
 * @constructor
 *
 * @param {shapy.editor.Rig.Type} type Type of the rig.
 */
shapy.editor.Rig = function(type) {
  /** @public {shapy.editor.Rig.Type} @const */
  this.type = type;
  /** @private {!goog.vec.Mat4.Type} @const */
  this.model_ = goog.vec.Mat4.createFloat32Identity();
  /** @private {{ x: boolean, y: boolean, z: boolean}} @const */
  this.hover_ = {
    x: false,
    y: false,
    z: false
  };
  /** @private {{ x: boolean, y: boolean, z: boolean}} @const */
  this.select_ = {
    x: false,
    y: false,
    z: false
  };
  // TODO: have rig retrieve this from control object.
  this.getPosition_ = function() {
    return [0, 0, 0];
  };
};


/**
 * Renders the rig.
 */
shapy.editor.Rig.prototype.render = goog.abstractMethod;


/**
 * Renders the rig.
 */
shapy.editor.Rig.prototype.mouseMove = goog.abstractMethod;


/**
 * Renders the rig.
 */
shapy.editor.Rig.prototype.mouseDown = goog.abstractMethod;


/**
 * Renders the rig.
 */
shapy.editor.Rig.prototype.mouseUp = goog.abstractMethod;


/**
 * Renders the rig.
 */
shapy.editor.Rig.prototype.mouseEnter = goog.abstractMethod;


/**
 * Renders the rig.
 */
shapy.editor.Rig.prototype.mouseLeave = goog.abstractMethod;



/**
 * List of rig types.
 * @enum {string}
 */
shapy.editor.Rig.Type = {
  TRANSLATE: 'translate',
  ROTATE: 'rotate',
  SCALE: 'scale'
};



/**
 * Rig used to alter position / translate objects.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Translate = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.TRANSLATE);
};
goog.inherits(shapy.editor.Rig.Translate, shapy.editor.Rig);


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Translate.prototype.render = function(gl, sh) {

};



/**
 * Rig used to alter rotation.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Rotate = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.ROTATE);
  /** @private {WebGLBuffer} */
  this.mesh_ = null;
};
goog.inherits(shapy.editor.Rig.Rotate, shapy.editor.Rig);


/** @type {number} @const */
shapy.editor.Rig.Rotate.RADIAL = 40;
/** @type {number} @const */
shapy.editor.Rig.Rotate.TUBULAR = 8;
/** @type {number} @const */
shapy.editor.Rig.Rotate.TORUS =
    shapy.editor.Rig.Rotate.RADIAL *
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
  var d = new Float32Array(shapy.editor.Rig.Rotate.TORUS * 3);

  var dp = 2 * Math.PI / shapy.editor.Rig.Rotate.RADIAL;
  var dt = 2 * Math.PI / shapy.editor.Rig.Rotate.TUBULAR;
  var k = 0, r, g, b;

  var emit = function(p, t) {
    d[k++] = Math.cos(p) * (1 + shapy.editor.Rig.Rotate.RADIUS * t);
    d[k++] = 0;
    d[k++] = Math.sin(p) * (1 + shapy.editor.Rig.Rotate.RADIUS * t);
  };

  for (var i = 0; i < shapy.editor.Rig.Rotate.RADIAL; ++i) {
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
  var i = shapy.editor.Rig.Rotate.TORUS / 3;

  if (!this.mesh_) {
    this.build_(gl);
  }

  sh.uniformMat4x4('u_model', this.model_);

  gl.enableVertexAttribArray(0);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  // Y ring.
  goog.vec.Mat4.makeIdentity(this.model_);
  sh.uniformMat4x4('u_model', this.model_);
  (this.hover_.y || this.select_.y) ?
      sh.uniform4f('u_colour', 1, 1, 0, 1) :
      sh.uniform4f('u_colour', 0, 0, 1, 1);
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  // X ring.
  goog.vec.Mat4.makeIdentity(this.model_);
  goog.vec.Mat4.rotateZ(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  (this.hover_.x || this.select_.x) ?
      sh.uniform4f('u_colour', 1, 1, 0, 1) :
      sh.uniform4f('u_colour', 1, 0, 0, 1);
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  // Z ring.
  goog.vec.Mat4.makeIdentity(this.model_);
  goog.vec.Mat4.rotateX(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  (this.hover_.z || this.select_.z) ?
      sh.uniform4f('u_colour', 1, 1, 0, 1) :
      sh.uniform4f('u_colour', 0, 1, 0, 1);
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  gl.disableVertexAttribArray(0);
};


/**
 * Computes the intersection point between a ray and a plane.
 *
 * @param {!goog.vec.Ray}       ray
 * @param {!goog.vec.Vec3.Type} n
 * @param {!goog.vec.Vec3.Type} o
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.intersectPlane = function(ray, n, o) {
  var d = -goog.vec.Vec3.dot(n, o);
  var v = goog.vec.Vec3.cloneFloat32(ray.dir);
  goog.vec.Vec3.scale(
      v,
     -(goog.vec.Vec3.dot(ray.origin, n) + d) / goog.vec.Vec3.dot(ray.dir, n),
      v);
  goog.vec.Vec3.add(v, ray.origin, v);
  return v;
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
  var position = this.getPosition_();

  // Find intersection point with planes.
  var ix = shapy.editor.intersectPlane(ray, [1, 0, 0], position);
  var iy = shapy.editor.intersectPlane(ray, [0, 1, 0], position);
  var iz = shapy.editor.intersectPlane(ray, [0, 0, 1], position);

  // Find distance between center and intersection point.
  var cx = goog.vec.Vec3.distance(ix, position);
  var cy = goog.vec.Vec3.distance(iy, position);
  var cz = goog.vec.Vec3.distance(iz, position);

  // Find distance to intersection points.
  var ex = goog.vec.Vec3.distance(ix, ray.origin);
  var ey = goog.vec.Vec3.distance(iy, ray.origin);
  var ez = goog.vec.Vec3.distance(iz, ray.origin);

  // Choose the best match - closest to origin.
  var hits = [[[1, 0, 0], cx, ex], [[0, 1, 0], cy, ey], [[0, 0, 1], cz, ez]];
  hits = goog.array.filter(hits, function(e) {
      return Math.abs(e[1] - 1.0) < shapy.editor.Rig.Rotate.RADIUS;
  }, this);
  goog.array.sort(hits, function(e) { return -e[2]; }, this);
  console.log(hits);

  // If no hits, return
  if (goog.array.isEmpty(hits)) {
    return null;
  }
  return hits[0][0];
};


/**
 * Renders the rig.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseMove = function(ray) {
  if (this.select_.x) {
    return;
  }
  if (this.select_.y) {
    return;
  }
  if (this.select_.z) {
    return;
  }

  var hit = this.getHit_(ray);
  if (!hit) {
    this.hover_.x = this.hover_.y = this.hover_.z = false;
    return;
  }

  this.hover_.x = hit[0] != 0;
  this.hover_.y = hit[1] != 0;
  this.hover_.z = hit[2] != 0;
};


/**
 * Renders the rig.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseDown = function(ray) {
};


/**
 * Renders the rig.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseUp = function(ray) {
};


/**
 * Renders the rig.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseEnter = function(ray) {
};


/**
 * Renders the rig.
 */
shapy.editor.Rig.Rotate.prototype.mouseLeave = function() {
};



/**
 * Rig used to alter scaling.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Scale = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.SCALE);
};
goog.inherits(shapy.editor.Rig.Scale, shapy.editor.Rig);


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Scale.prototype.render = function(gl, sh) {

};
