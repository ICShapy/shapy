// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Object');

goog.require('goog.vec.Mat4');
goog.require('goog.vec.Vec3');



/**
 * Abstract object metadata.
 *
 * Properties:
 *  - rotate
 *  - translate
 *  - scale
 * These properties can be edited using markers placed over the object. They
 * apply to every single vertex in the object by defining the model
 * matrix of the object.
 *
 * @constructor
 */
shapy.editor.Object = function() {
  /** @public {number} */
  this.id = 1;

  /** @private {goog.vec.Vec3} @const */
  this.scale_ = goog.vec.Vec3.createFromValues(1, 1, 1);
  /** @private {goog.vec.Vec3} @const */
  this.rotate_ = goog.vec.Vec3.createFromValues(0, 0, 0);
  /** @private {goog.vec.Vec3} @const */
  this.translate_ = goog.vec.Vec3.createFromValues(0, 0, 0);

  /**
   * Cached model matrix, computed from scale, rotate and translate.
   * @private {goog.vec.Mat4} @const
   */
  this.model_ = goog.vec.Mat4.createFloat32();

  /**
   * True if any data field is dirty.
   * @private {boolean}
   */
  this.dirtyData_ = true;

  /**
   * True if the mesh is dirty, needing to be rebuilt.
   * @private {boolean}
   */
  this.dirtyMesh = true;
};


/**
 * Recomputes the model matrix.
 *
 * @private
 */
shapy.editor.Object.prototype.computeModel_ = function() {
  goog.vec.Mat4.scale(
      this.model_,
      this.scale_[0], this.scale_[1], this.scale_[2]);
  goog.vec.Mat4.rotateX(
      this.model_,
      this.rotate_[0]);
  goog.vec.Mat4.rotateY(
      this.model_,
      this.rotate_[1]);
  goog.vec.Mat4.rotateZ(
      this.model_,
      this.rotate_[2]);
  goog.vec.Mat4.translate(
      this.model_,
      this.translate_[0], this.translate_[1], this.translate_[2]);
};

