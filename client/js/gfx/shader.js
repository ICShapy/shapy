// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.gfx.Shader');

goog.require('goog.webgl');



/**
 * Generic shader class.
 *
 * @constructor
 */
shapy.gfx.Shader = function() {

};


/**
 * Compiles a shader source.
 */
shapy.gfx.Shader.prototype.compile = function(type, source) {

};


/**
 * Links the whole shader.
 */
shapy.gfx.Shader.prototype.link = function() {

};



/**
 * Shader that renders coloured meshes.
 */
shapy.gfx.ColourShader = function() {
  this.compile_(goog.webgl.VERTEX_SHADER, shapy.gfx.ColourShader.VS_);
  this.compile_(goog.webgl.FRAGMENT_SHADER, shapy.gfx.ColourShader.FS_);
  this.link_();
};


/** @private {string} @const */
shapy.gfx.ColourShader.VS_ = 'void main() {}';


/** @private {string} @const */
shapy.gfx.ColourShader.FS_ = 'void main() {}';
