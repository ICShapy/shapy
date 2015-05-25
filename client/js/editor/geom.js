// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.geom');



/**
 * Computes the intersection point between a ray and a plane.
 *
 * @param {!goog.vec.Ray}       ray
 * @param {!goog.vec.Vec3.Type} n
 * @param {!goog.vec.Vec3.Type} o
 *
 * @return {!goog.vec.Vec3.Type}
 */
shapy.editor.geom.intersectPlane = function(ray, n, o) {
  var d = -goog.vec.Vec3.dot(n, o);
  var v = goog.vec.Vec3.cloneFloat32(ray.dir);
  goog.vec.Vec3.scale(
      v,
     -(goog.vec.Vec3.dot(ray.origin, n) + d) / goog.vec.Vec3.dot(ray.dir, n),
      v);
  goog.vec.Vec3.add(v, ray.origin, v);
  return v;
};
