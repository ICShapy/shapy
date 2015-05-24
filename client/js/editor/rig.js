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
 * List of vertices used by the renderer is given in the following format:
 *
 * +----+----+----------------+--------------------+
 * | of | ln | Fields         | Description        |
 * +----+----+----------------+--------------------+
 * | 0  | 12 | vx, vy, vz     | Vertex position    |
 * +----+----+----------------+--------------------+
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
};


/**
 * Renders the rig.
 */
shapy.editor.Rig.prototype.render = goog.abstractMethod;


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
 * Number of points used for the base of the arrowhead.
 * @type {number} @const
 */
shapy.editor.Rig.Translate.CIRCLE = 16;


/**
 * Creates the mesh for the rig.
 *
 * @private
 *
 * @param {!WebGLContext}        gl WebGL context.
 */
shapy.editor.Rig.Translate.prototype.build_ = function(gl) {
  var d = new Float32Array(shapy.editor.Rig.Translate.CIRCLE * 18 + 6);
  var angle = 2 * Math.PI / shapy.editor.Rig.Translate.CIRCLE;
  var k = 0;

  d[k++] = 0.0; d[k++] = 0.0; d[k++] = 0.0;
  d[k++] = 1.0; d[k++] = 0.0; d[k++] = 0.0;

  for (var i = 0; i < shapy.editor.Rig.Translate.CIRCLE; i++) {
    var py = 0.05 * Math.sin(i * angle);
    var pz = 0.05 * Math.cos(i * angle);
    var cy = 0.05 * Math.sin((i + 1) * angle);
    var cz = 0.05 * Math.cos((i + 1) * angle);

    d[k++] = 1.0; d[k++] = py;  d[k++] = pz;
    d[k++] = 1.0; d[k++] = 0.0; d[k++] = 0.0;    
    d[k++] = 1.0; d[k++] = cy;  d[k++] = cz;
 
    d[k++] = 1.125; d[k++] = 0.0; d[k++] = 0.0; 
    d[k++] = 1.0;   d[k++] = py;  d[k++] = pz;
    d[k++] = 1.0;   d[k++] = cy;  d[k++] = cz;
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
shapy.editor.Rig.Translate.prototype.render = function(gl, sh) {
  if (!this.mesh_) {
    this.build_(gl);
  }

  sh.uniformMat4x4('u_model', this.model_);

  gl.enableVertexAttribArray(0);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  // Arrow on X.
  sh.uniformMat4x4('u_model', this.model_);
  (this.hover_.x || this.select_.x) ?
      sh.uniform4f('u_colour', 1, 1, 0, 1) :
      sh.uniform4f('u_colour', 1, 0, 0, 1);
  gl.drawArrays(gl.LINE_STRIP, 0, 2);
  gl.drawArrays(goog.webgl.TRIANGLES, 2, shapy.editor.Rig.Translate.CIRCLE * 6);

  gl.disableVertexAttribArray(0);
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
    shapy.editor.Rig.Rotate.TUBULAR *
    18;



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
  var k = 0;


  var emit = function(p, t) {
    d[k++] = Math.cos(p) * (1 + 0.025 * Math.cos(t));
    d[k++] = 0.025 * Math.sin(t);
    d[k++] = Math.sin(p) * (1 + 0.025 * Math.cos(t));
  };

  for (var i = 0; i < shapy.editor.Rig.Rotate.RADIAL; ++i) {
    var p0 = (i + 0) * dp, p1 = (i + 1) * dp;
    for (var j = 0; j < shapy.editor.Rig.Rotate.TUBULAR; ++j) {
      var t0 = (j + 0) * dt, t1 = (j + 1) * dt;

      emit(p0, t0);
      emit(p0, t1);
      emit(p1, t1);
      emit(p0, t0);
      emit(p1, t1);
      emit(p1, t0);
    }
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
