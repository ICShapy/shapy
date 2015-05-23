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


/**
 * Creates the mesh for the rig.
 *
 * @private
 *
 * @param {!WebGLContext}        gl WebGL context.
 */
shapy.editor.Rig.Rotate.prototype.build_ = function(gl) {
  var data = new Float32Array([
      -1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
      -1.0,  1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
       1.0,  1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
       1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 1.0
  ]);

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, data, goog.webgl.STATIC_DRAW);
};


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Rotate.prototype.render = function(gl, sh) {
  if (!this.mesh_) {
    this.build_(gl);
  }

  sh.uniformMat4x4('u_model', this.model_);

  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(3);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 28, 0);
  gl.vertexAttribPointer(3, 4, goog.webgl.FLOAT, false, 28, 12);
  gl.drawArrays(gl.LINE_LOOP, 0, 4);

  gl.disableVertexAttribArray(3);
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
