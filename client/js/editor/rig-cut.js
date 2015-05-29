// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig.Cut');

goog.require('shapy.editor.Rig');

/**
 * Rig used for cutting.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Cut = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.CUT);

  /**
   * @private {!Array<goog.vec.Vec3.Type>} ps_ Points forming the cut plane.
   */
  this.ps_ = [
      goog.vec.Vec3.createFloat32(),
      goog.vec.Vec3.createFloat32(),
      goog.vec.Vec3.createFloat32()
  ];

  /**
   * @private {number} turn_ Cut point to be updated.
   */
  this.turn_ = 0;

  /**
   * @private {goog.vec.Vec3.Type} norm_ Normal of the cut plane.
   */
  this.norm_ = goog.vec.Vec3.createFloat32();
};
goog.inherits(shapy.editor.Rig.Cut, shapy.editor.Rig);


/**
 * Renders the cut rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Cut.prototype.render = function(gl, sh) {

};


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Cut.prototype.mouseMove = function(ray) {
  //console.log(this.ps_);
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Cut.prototype.mouseDown = function(ray) {
  var hits = goog.array.flatten(this.object.pick(ray));

  if (goog.array.isEmpty(hits)) {
    return null;
  }

  goog.array.sort(hits, function(a, b) {
    var da = goog.vec.Vec3.distance(ray.origin, a.point);
    var db = goog.vec.Vec3.distance(ray.origin, b.point);
    return da - db;
  }, this);

  var i = hits[0].point;

  // Record the point.
  goog.vec.Vec3.setFromValues(this.ps_[this.turn_], i[0], i[1], i[2]);
  this.turn_ = (this.turn_ + 1) % this.ps_.length;

  // Re-calculate the normal of the cut plane.
  var v10 = goog.vec.Vec3.createFloat32();
  var v20 = goog.vec.Vec3.createFloat32();

  goog.vec.Vec3.subtract(this.ps_[1], this.ps_[0], v10);
  goog.vec.Vec3.subtract(this.ps_[2], this.ps_[0], v20);
  goog.vec.Vec3.cross(v10, v20, this.norm_);
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Cut.prototype.mouseUp = function(ray) {
  //console.log(this.ps_);
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Cut.prototype.mouseLeave = function() {

};