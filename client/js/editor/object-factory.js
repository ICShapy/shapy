// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.create');

goog.require('shapy.editor.Object');



/**
 * Build an cube object from triangles.
 *
 * @param {string}      id
 * @param {shapy.Scene} scene
 * @param {number}      w
 * @param {number}      h
 * @param {number}      d
 *
 * @return {!shapy.editor.Object}
 */
shapy.editor.create.cube = function(id, scene, w, h, d) {
  // Vertex layout:
  //   5-----6
  //  /     /|
  // 1-----2 |
  // | 7   | 8
  // |     |/
  // 3-----4
  var vertices = [
    [-w, +h, +d], // 1
    [+w, +h, +d], // 2
    [-w, -h, +d], // 3
    [+w, -h, +d], // 4
    [-w, +h, -d], // 5
    [+w, +h, -d], // 6
    [-w, -h, -d], // 7
    [+w, -h, -d], // 8
  ];

  var edges = [
    [1, 2], //  1
    [2, 3], //  2
    [3, 1], //  3
    [2, 4], //  4
    [4, 3], //  5
    [6, 8], //  6
    [8, 7], //  7
    [7, 5], //  8
    [5, 8], //  9
    [6, 5], // 10
    [1, 5], // 11
    [2, 5], // 12
    [6, 2], // 13
    [1, 7], // 14
    [3, 7], // 15
    [4, 6], // 16
    [4, 8], // 17
    [3, 8], // 18
  ];

  // Faces
  var faces = [
    [+1, +2, +3], [+4, +5, -2],      // +Z
    [+10, +9, -6], [-9, -8, -7],     // -Z
    [-1, +11, -12], [+12, -10, +13], // +Y
    [+18, +7, -15], [-18, -5, +17],  // -Y
    [-16, -4, -13], [+16, +6, -17],  // +X
    [+14, +8, -11], [-3, +15, -14],  // -X
  ];

  return new shapy.editor.Object(id, scene, vertices, edges, faces);
};


/**
 * Builds an sphere object from triangles.
 *
 * @param {string}      id
 * @param {shapy.Scene} scene
 * @param {number}      r
 * @param {number}      slices
 * @param {number}      stacks
 *
 * @return {!shapy.editor.Object}
 */
shapy.editor.create.sphere = function(id, scene, r, slices, stacks) {
  var verts = [], edges = [], faces = [];

  // Create all verts.
  var dPhi = Math.PI / stacks, dTheta = 2 * Math.PI / slices;
  verts.push([0, r, 0]);
  for (var i = 1; i < stacks; ++i) {
    var phi = Math.PI / 2.0 - dPhi * i;
    for (var j = 0; j < slices; ++j) {
      var theta = dTheta * j;
      verts.push([
        r * Math.cos(phi) * Math.sin(theta),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.cos(theta)
      ]);
    }
  }
  verts.push([0, -r, 0]);

  for (var j = 0; j < slices; ++j) {
    var v00 = 1;
    var v01 = 2 + j;

    edges.push([1, 2 + j]);
    faces.push([
        -(1 + (j + 0) % slices),
        +(1 + (j + 1) % slices),
        -(1 + slices + j * 3),
    ]);
  }

  for (var i = 1; i < stacks - 1; ++i) {
    for (var j = 0; j < slices; ++j) {
      var v00 = 2 + (i - 1) * slices + (j + 0) % slices;
      var v01 = 2 + (i - 1) * slices + (j + 1) % slices;
      var v10 = 2 + (i - 0) * slices + (j + 0) % slices;
      var v11 = 2 + (i - 0) * slices + (j + 1) % slices;

      edges.push([v00, v01]);
      edges.push([v01, v11]);
      edges.push([v11, v00]);
      faces.push([
          slices + (i - 1) * 3 * slices + j * 3 + 1,
          slices + (i - 1) * 3 * slices + j * 3 + 2,
          slices + (i - 1) * 3 * slices + j * 3 + 3
      ]);
      if (i < stacks - 2) {
        faces.push([
            slices + (i - 1) * 3 * slices + j * 3 + 3,
            slices + (i - 0) * 3 * slices + j * 3 + 1,
            slices + (i - 1) * 3 * slices + (j - 1 + slices) % slices * 3 + 2,
        ]);
      } else {
        faces.push([
            slices + (i - 1) * 3 * slices + j * 3 + 3,
            slices + (stacks - 2) * 3 * slices + j % slices * 2 + 1,
            slices + (i - 1) * 3 * slices + (j - 1 + slices) % slices * 3 + 2,
        ]);
      }
    }
  }

  for (var j = 0; j < slices; ++j) {
    var v00 = 2 + (stacks - 1) * slices;
    var v01 = 2 + (stacks - 2) * slices + j;
    var v10 = 2 + (stacks - 2) * slices + (j + 1) % slices;

    edges.push([v01, v10]);
    edges.push([v00, v01]);
    faces.push([
      -(slices + (stacks - 2) * slices * 3 + (j + 0) % slices * 2 + 1),
      +(slices + (stacks - 2) * slices * 3 + (j + 1) % slices * 2 + 2),
      -(slices + (stacks - 2) * slices * 3 + (j + 0) % slices * 2 + 2),
    ]);
  }

  return new shapy.editor.Object(id, scene, verts, edges, faces);
};
