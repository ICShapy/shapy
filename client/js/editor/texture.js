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
  /** @private {boolean} */
  this.dirty_ = true;
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
  gl.texParameteri(
      goog.webgl.TEXTURE_2D,
      goog.webgl.TEXTURE_MAG_FILTER,
      goog.webgl.LINEAR);
  gl.texParameteri(
      goog.webgl.TEXTURE_2D,
      goog.webgl.TEXTURE_MIN_FILTER,
      goog.webgl.LINEAR);
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

  if (this.dirty_) {
    gl.texImage2D(
        goog.webgl.TEXTURE_2D,
        0,
        goog.webgl.RGB,
        this.width, this.height,
        0,
        goog.webgl.RGB,
        goog.webgl.UNSIGNED_BYTE,
        this.data_);
    this.dirty_ = false;
  }
};


/**
 * Very badass method which uses a brush to paint an object.
 *
 * @param {number} u
 * @param {number} v
 * @param {number} colour
 * @param {number} size
 */
shapy.editor.Texture.prototype.paint = function(u, v, colour, size) {
  var x = Math.floor(u * this.width);
  var y = Math.floor(v * this.height);

  size = 5;
  for (var i = y - size; i <= y + size; ++i) {
    for (var j = x - size; j <= x + size; ++j) {
      if (i < 0 || this.width <= i || j < 0 || this.height <= j) {
        continue;
      }

      var a = 1.0 - Math.sqrt(
          Math.pow((j - x) / size, 2) + Math.pow((i - y) / size, 2));
      a = Math.max(Math.min(a, 1.0), 0.0);

      var k = i * this.width + j;

      var r = this.data_[k * 3 + 0];
      var g = this.data_[k * 3 + 1];
      var b = this.data_[k * 3 + 2];

      r = r * (1 - a) + colour[0] * a;
      g = g * (1 - a) + colour[1] * a;
      b = b * (1 - a) + colour[2] * a;
      r = Math.max(Math.min(r, 255), 0);
      g = Math.max(Math.min(g, 255), 0);
      b = Math.max(Math.min(b, 255), 0);

      this.data_[k * 3 + 0] = r;
      this.data_[k * 3 + 1] = g;
      this.data_[k * 3 + 2] = b;
    }
  }
  this.dirty_ = true;
};
