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

  /**
   * True if the mesh is dirty, needing to be rebuilt.
   * @public {boolean}
   */
  this.dirtyMesh = true;

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
   * Position of the object
   * @private {goog.vec.Vec3}
   */
  this.position_ = goog.vec.Vec3.createFromValues(0, 0, 0);

  /**
   * True if any data field is dirty.
   * @private {boolean}
   */
  this.dirtyData_ = true;

  /**
   * Version number.
   * @private {number}
   */
  this.versionNumber_ = 1;

  /**
   * Colour.
   * @private {number}
   */
  this.colour_ = 0xffffff;
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


/**
 * Retrieves the object data.
 */
shapy.editor.Object.prototype.getData = function() {
  return {
    id: this.id,
    dirtyMesh: this.dirtyMesh,

    sx: this.scale_[0],
    sy: this.scale_[1],
    sz: this.scale_[2],

    rx: this.rotate_[0],
    ry: this.rotate_[1],
    rz: this.rotate_[2],

    tx: this.translate_[0],
    ty: this.translate_[1],
    tz: this.translate_[2],

    dirtyData: this.dirtyData_,
    versionNumber: this.versionNumber_,

    colour: this.colour_
  };
};

/**
 * Retrieves the object position.
 */
shapy.editor.Object.prototype.getPosition = function() {
  return this.position_;
};