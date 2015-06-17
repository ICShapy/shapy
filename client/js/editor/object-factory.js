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
  var vertices = {
    1: [-w, +h, +d],
    2: [+w, +h, +d],
    3: [-w, -h, +d],
    4: [+w, -h, +d],
    5: [-w, +h, -d],
    6: [+w, +h, -d],
    7: [-w, -h, -d],
    8: [+w, -h, -d],
  };

  var edges = {
     1: [1, 2],
     2: [2, 3],
     3: [3, 1],
     4: [2, 4],
     5: [4, 3],
     6: [6, 8],
     7: [8, 7],
     8: [7, 5],
     9: [5, 8],
    10: [6, 5],
    11: [1, 5],
    12: [2, 5],
    13: [6, 2],
    14: [1, 7],
    15: [3, 7],
    16: [4, 6],
    17: [4, 8],
    18: [3, 8],
  };

  // Faces
  var faces = {
     1: [+1, +2, +3],
     2: [+4, +5, -2],     // +Z
     3: [+10, +9, -6],
     4: [-9, -8, -7],     // -Z
     5: [-1, +11, -12],
     6: [+12, -10, +13],  // +Y
     7: [+18, +7, -15],
     8: [-18, -5, +17],   // -Y
     9: [-16, -4, -13],
    10: [+16, +6, -17],   // +X
    11: [+14, +8, -11],
    12: [-3, +15, -14],   // -X
  };

  return new shapy.editor.Object(id, scene, null, vertices, edges, faces);
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
  var verts = [], edges = [], faces = [], v = 1, e = 1, f = 1;

  // Create all verts.
  var dPhi = Math.PI / stacks, dTheta = 2 * Math.PI / slices;
  verts[v++] = [0, r, 0];
  for (var i = 1; i < stacks; ++i) {
    var phi = Math.PI / 2.0 - dPhi * i;
    for (var j = 0; j < slices; ++j) {
      var theta = dTheta * j;
      verts[v++] = [
        r * Math.cos(phi) * Math.sin(theta),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.cos(theta)
      ];
    }
  }
  verts[v++] = [0, -r, 0];

  for (var j = 0; j < slices; ++j) {
    var v00 = 1;
    var v01 = 2 + j;

    edges[e++] = [1, 2 + j];
    faces[f++] = [
        -(1 + (j + 0) % slices),
        +(1 + (j + 1) % slices),
        -(1 + slices + j * 3),
    ];
  }

  for (var i = 1; i < stacks - 1; ++i) {
    for (var j = 0; j < slices; ++j) {
      var v00 = 2 + (i - 1) * slices + (j + 0) % slices;
      var v01 = 2 + (i - 1) * slices + (j + 1) % slices;
      var v10 = 2 + (i - 0) * slices + (j + 0) % slices;
      var v11 = 2 + (i - 0) * slices + (j + 1) % slices;

      edges[e++] = [v00, v01];
      edges[e++] = [v01, v11];
      edges[e++] = [v11, v00];
      faces[f++] = [
          slices + (i - 1) * 3 * slices + j * 3 + 1,
          slices + (i - 1) * 3 * slices + j * 3 + 2,
          slices + (i - 1) * 3 * slices + j * 3 + 3
      ];
      if (i < stacks - 2) {
        faces[f++] = [
            slices + (i - 1) * 3 * slices + j * 3 + 3,
            slices + (i - 0) * 3 * slices + j * 3 + 1,
            slices + (i - 1) * 3 * slices + (j - 1 + slices) % slices * 3 + 2,
        ];
      } else {
        faces[f++] = [
            slices + (i - 1) * 3 * slices + j * 3 + 3,
            slices + (stacks - 2) * 3 * slices + j % slices * 2 + 1,
            slices + (i - 1) * 3 * slices + (j - 1 + slices) % slices * 3 + 2,
        ];
      }
    }
  }

  for (var j = 0; j < slices; ++j) {
    var v00 = 2 + (stacks - 1) * slices;
    var v01 = 2 + (stacks - 2) * slices + j;
    var v10 = 2 + (stacks - 2) * slices + (j + 1) % slices;

    edges[e++] = [v01, v10];
    edges[e++] = [v00, v01];
    faces[f++] = [
      -(slices + (stacks - 2) * slices * 3 + (j + 0) % slices * 2 + 1),
      +(slices + (stacks - 2) * slices * 3 + (j + 1) % slices * 2 + 2),
      -(slices + (stacks - 2) * slices * 3 + (j + 0) % slices * 2 + 2),
    ];
  }

  return new shapy.editor.Object(id, scene, null, verts, edges, faces);
};


/**
 * Build a pyramid object from triangles.
 *
 * @param {string}      id
 * @param {shapy.Scene} scene
 * @param {number}      b
 * @param {number}      h
 *
 * @return {!shapy.editor.Object}
 */
shapy.editor.create.pyramid = function(id, scene, b, h) {
  // Vertex layout:
  //
  //      5
  // 
  //   4-----3
  //  /     /
  // 1-----2
  var vertices = {
    1: [-b, -h, -b],
    2: [+b, -h, -b],
    3: [+b, -h, +b],
    4: [-b, -h, +b],
    5: [ 0, +h,  0]
  };

  var edges = {
    1: [1, 2],
    2: [2, 3],
    3: [3, 1],
    4: [1, 4],
    5: [4, 3],
    6: [2, 5],
    7: [5, 1],
    8: [4, 5],
    9: [5, 3]
  };

  var faces = {
    1: [+1, +2, +3],
    2: [+3, +4, +5],
    3: [+2, -9, -6],
    4: [+1, +6, +7],
    5: [+4, +8, +7],
    6: [+5, -9, -8]
  };

  return new shapy.editor.Object(id, scene, null, vertices, edges, faces);
};

