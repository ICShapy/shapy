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

  // TODO: handle properly.
  this.canCut = false;
};
goog.inherits(shapy.editor.Rig.Cut, shapy.editor.Rig);


/**
 * Builds a plane mesh.
 *
 * @private
 *
 * @param {!WebGLContext}   gl WebGL context.
 */
shapy.editor.Rig.Cut.prototype.build_ = function(gl) {
  var d = new Float32Array(4 * 3);
  var k = 0;

  d[k++] =  1.0; d[k++] = 0.0; d[k++] = -1.0;
  d[k++] = -1.0; d[k++] = 0.0; d[k++] = -1.0;
  d[k++] =  1.0; d[k++] = 0.0; d[k++] =  1.0;
  d[k++] = -1.0; d[k++] = 0.0; d[k++] =  1.0;

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Computes rotation between the plane at the origin and the cut plane.
 *
 * @private
 *
 * @param {goog.vec.Vec3.Type} v Normal unit vector of the plane to be rotated.
 */
shapy.editor.Rig.Cut.prototype.computeRotTrans_ = function() {
  var p = this.object.getPosition();
  var v = goog.vec.Vec3.createFloat32FromValues(0, 1, 0);
  var r = goog.vec.Mat4.createFloat32();
  var q = goog.vec.Quaternion.createFloat32();
  var c = goog.vec.Vec3.createFloat32();
  var t = goog.vec.Vec3.createFloat32();

  // Compute the translation.
  var t = shapy.editor.geom.getCentroid(this.ps_[0], this.ps_[1], this.ps_[2]);
  goog.vec.Mat4.makeTranslate(this.model_, t[0], t[1], t[2]);

  // Compute the rotation quaternion.
  goog.vec.Vec3.cross(v, this.norm_, c);
  var vmag = goog.vec.Vec3.magnitude(v);
  var nmag = goog.vec.Vec3.magnitude(this.norm_);

  goog.vec.Quaternion.setFromValues(
      q, c[0], c[1], c[2], Math.sqrt(
          vmag * vmag * nmag * nmag) + goog.vec.Vec3.dot(v, this.norm_));
  goog.vec.Quaternion.normalize(q, q);

  // Compute and apply the rotaion matrix.
  goog.vec.Quaternion.toRotationMatrix4(q, r);
  goog.vec.Mat4.multMat(this.model_, r, this.model_);
};

/**
 * Renders the cut rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Cut.prototype.render = function(gl, sh) {
  if (!this.canCut) {
    return;
  }

  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  this.computeRotTrans_();
  sh.uniformMat4x4('u_model', this.model_);
  sh.uniform4f('u_colour', 1.0, 0.0, 0.0, 1.0);
  gl.drawArrays(goog.webgl.TRIANGLES, 0, 3);
  gl.drawArrays(goog.webgl.TRIANGLES, 1, 3);

  gl.disableVertexAttribArray(0);
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

  if (this.turn_ == 2) {
    this.canCut = true;
  }

  // Record the point.
  goog.vec.Vec3.setFromValues(this.ps_[this.turn_], i[0], i[1], i[2]);
  this.turn_ = (this.turn_ + 1) % this.ps_.length;

  // Re-calculate the normal of the cut plane.
  var v10 = goog.vec.Vec3.createFloat32();
  var v20 = goog.vec.Vec3.createFloat32();

  goog.vec.Vec3.subtract(this.ps_[1], this.ps_[0], v10);
  goog.vec.Vec3.subtract(this.ps_[2], this.ps_[0], v20);
  goog.vec.Vec3.cross(v10, v20, this.norm_);
  goog.vec.Vec3.normalize(this.norm_, this.norm_);
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