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


/**
 * Determines if the ray intersects the sphere.
 *
 * @param {!goog.vec.Ray}  ray Ray
 * @param {!goog.vec.Vec3} c   Center of the sphere.
 * @param {number}         r   Radius of the sphere.
 */
shapy.editor.geom.intersectSphere = function(ray, c, r) {
  var origC = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.subtract(c, ray.origin, origC);

  var cross = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.cross(ray.dir, origC, cross);

  return goog.vec.Vec3.magnitude(cross) <= r;
};


/**
 * Determines if the ray intersects the axis-aligned cube using a modified
 * version of Smits' algorithm.
 *
 * @param {!goog.vec.Ray}  ray Ray
 * @param {!goog.vec.Vec3} c   Center of the cube.
 * @param {number}         a   Length of the edge.
 */
shapy.editor.geom.intersectCube = function(ray, c, a) {
  var tmin, tmax, tymin, tymax, tzmin, zmax, div;

  var min = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.setFromValues(min, c[0] - a / 2, c[1] - a / 2, c[2] - a / 2);

  var max = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.setFromValues(max, c[0] + a / 2, c[1] + a / 2, c[2] + a / 2);

  div = 1 / ray.dir[0];

  if (ray.dir[0] >= 0) {
    tmin = (min[0] - ray.origin[0]) * div;
    tmax = (max[0] - ray.origin[0]) * div;
  } else {
    tmin = (max[0] - ray.origin[0]) * div;
    tmax = (min[0] - ray.origin[0]) * div;
  }

  div = 1 / ray.dir[1];

  if (ray.dir[1] >= 0) {
    tymin = (min[1] - ray.origin[1]) * div;
    tymax = (max[1] - ray.origin[1]) * div;
  } else {
    tymin = (max[1] - ray.origin[1]) * div;
    tymax = (min[1] - ray.origin[1]) * div;
  }

  if ((tmin > tymax) || (tymin > tmax)) {
    return false;
  }

  if (tymin > tmin) {
    tmin = tymin;
  }

  if (tymax < tmax) {
    tmax = tymax;
  }

  div = 1 / ray.dir[2];

  if (ray.dir[2] >= 0) {
    tzmin = (min[2] - ray.origin[2]) * div;
    tzmax = (max[2] - ray.origin[2]) * div;
  } else {
    tzmin = (max[2] - ray.origin[2]) * div;
    tzmax = (min[2] - ray.origin[2]) * div;
  }

  if ((tmin > tzmax) || (tzmin > tmax)) {
    return false;
  }

  if (tzmin > tmin) {
    tmin = tzmin;
  }

  if (tzmax < tmax) {
    tmax = tzmax;
  }

  return (tmin < Number.MAX_VALUE) || (tmax > 0.0);
};