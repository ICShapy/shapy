// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Texture');



/**
 * Creates a new texture.
 *
 * @constructor
 *
 * @param {=number} opt_width
 * @param {=number} opt_height
 */
shapy.editor.Texture = function(opt_width, opt_height) {
  /** @public {number} */
  this.width = opt_width || 512;
  /** @public {number} */
  this.height = opt_height || 512;
  /** @private {WebGLTexture} */
  this.texture_ = null;
  /** @private {number} */
  this.data_ = new Uint8Array(this.width * this.height * 3);
  for (var i = 0; i < this.width * this.height * 3; ++i) {
    this.data_[i] = 0xFF;
  }
};


/**
 * Builds the texture.
 *
 * @private
 *
 * @param {!WebGLContext} gl
 */
shapy.editor.Texture.prototype.build_ = function(gl) {
  this.texture_ = gl.createTexture();
  gl.bindTexture(goog.webgl.TEXTURE_2D, this.texture_);
  gl.texImage2D(
      goog.webgl.TEXTURE_2D,
      0,
      goog.webgl.RGB,
      this.width, this.height,
      0,
      goog.webgl.RGB,
      goog.webgl.UNSIGNED_BYTE,
      this.data_);
  gl.texParameteri(
      goog.webgl.TEXTURE_2D,
      goog.webgl.TEXTURE_MAG_FILTER,
      goog.webgl.NEAREST);
  gl.texParameteri(
      goog.webgl.TEXTURE_2D,
      goog.webgl.TEXTURE_MIN_FILTER,
      goog.webgl.NEAREST);
};


/**
 * Binds (and builds) the texture.
 *
 * @param {!WebGLContext} gl
 */
shapy.editor.Texture.prototype.bind = function(gl) {
  if (!this.texture_) {
    this.build_(gl);
  }
  gl.bindTexture(goog.webgl.TEXTURE_2D, this.texture_);
};
