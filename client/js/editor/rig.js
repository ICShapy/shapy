// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig');



/**
 * Rigs are attached to objects in order to edit their properties.
 *
 * The user can move the rig around with the mouse, altering the translation,
 * position, scaling or rotation of an object.
 *
 * List of vertices used by the renderer is given in the following format:
 *
 * +----+----+----------------+--------------------+
 * | of | ln | Fields         | Description        |
 * +----+----+----------------+--------------------+
 * | 0  | 12 | vx, vy, vz     | Vertex position    |
 * +----+----+----------------+--------------------+
 *
 * @constructor
 *
 * @param {shapy.editor.Rig.Type} type Type of the rig.
 */
shapy.editor.Rig = function(type) {
  /**
   * @public {shapy.editor.Rig.Type}
   * @const
   */
  this.type = type;

  /**
   * @private {WebGLBuffer}
   */
  this.mesh_ = null;

  /**
   * This represents the scale of the rig relative to the base size, used to
   * ensure the rig stays at a constant size depending on distance
   * @private {!number}
   */
  this.size_ = 1;

  /**
   * @private {!goog.vec.Mat4.Type}
   */
  this.model_ = goog.vec.Mat4.createFloat32Identity();

  /**
   * @private {{ x: boolean, y: boolean, z: boolean}}
   * @const
   */
  this.hover_ = {
    x: false,
    y: false,
    z: false
  };

  /**
   * @private {{ x: boolean, y: boolean, z: boolean}}
   * @const
   */
  this.select_ = {
    x: false,
    y: false,
    z: false
  };

  /** @public {shapy.editor.Editable} */
  this.object = null;

  /** @public {Function} */
  this.onFinish = null;
};


/**
 * Length of the axis tube
 * @type {number} @const
 */
shapy.editor.Rig.AXIS_LENGTH = 1;


/**
 * Radius of the axis tube
 * @type {number} @const
 */
shapy.editor.Rig.AXIS_RADIUS = 0.025;


/**
 * Clears up resources used by the rig.
 */
shapy.editor.Rig.prototype.destroy = function() {
  // TODO: retain GL context & clear properly.
  this.mesh_ = null;
};


/**
 * Sets the scale of the rig and recomputes the scale matrix
 *
 * @param {number} distance Distance of the camera from it's focus point
 */
shapy.editor.Rig.prototype.setScale = function(distance) {
  this.size_ = distance / 8;
};


/**
 * Creates the mesh for a cube on the origin.
 *
 * @private
 *
 * @param {!goog.vec.Float32Array} d Array where the indices should be stored.
 * @param {number}                 k Index where to place the indices.
 * @param {number}                 a Length of an edge.
 */
shapy.editor.Rig.prototype.buildCube_ = function(d, k, a) {
  // Compute the vertices.
  var vertices = new Float32Array(24);
  var i = 0;

  for (var x = -1; x <= 1; x++) {
    for (var y = -1; y <= 1; y++) {
      for (var z = -1; z <= 1; z++) {
        if (x == 0 || y == 0 || z == 0) {
          continue;
        }

        vertices[i++] = (a / 2) * x;
        vertices[i++] = (a / 2) * y;
        vertices[i++] = (a / 2) * z;
      }
    }
  }

  // Vertices forming the triangles.
  var triangles = [
                   0, 4, 6, 6, 2, 0,
                   0, 4, 1, 4, 5, 1,
                   4, 5, 7, 7, 6, 4,
                   5, 7, 3, 3, 1, 5,
                   0, 1, 3, 3, 0, 2,
                   2, 6, 7, 7, 3, 2
                  ];

  // Construct the cube.
  for (var i = 0; i < triangles.length; i++) {
    var vertex = triangles[i];

    d[k++] = vertices[3 * vertex    ];
    d[k++] = vertices[3 * vertex + 1];
    d[k++] = vertices[3 * vertex + 2];
  }
};


/**
 * Creates the mesh for a tube parrallel to the x axis.
 *
 * @private
 *
 * @param {!goog.vec.Float32Array} d Array where the indices should be stored.
 * @param {number}                 k Index where to place the indices.
 * @param {number}                 b Number of points in the base.
 * @param {number}                 l Length of the tube.
 * @param {number}                 r Radius of the base.
 * @param {!goog.vec.Float32Array} c Center of the base.
 */
shapy.editor.Rig.prototype.buildTube_ = function(d, k, b, l, r, c) {
  var angle = 2 * Math.PI / b;

  for (var i = 0; i < b; i++) {
    var py = r * Math.sin(i * angle);
    var pz = r * Math.cos(i * angle);
    var cy = r * Math.sin((i + 1) * angle);
    var cz = r * Math.cos((i + 1) * angle);

    d[k++] = c[0] + l; d[k++] = c[1] + py; d[k++] = c[2] + pz;
    d[k++] = c[0];     d[k++] = c[1] + py; d[k++] = c[2] + pz;
    d[k++] = c[0];     d[k++] = c[1] + cy; d[k++] = c[2] + cz;

    d[k++] = c[0];     d[k++] = c[1] + cy; d[k++] = c[2] + cz;
    d[k++] = c[0] + l; d[k++] = c[1] + cy; d[k++] = c[2] + cz;
    d[k++] = c[0] + l; d[k++] = c[1] + py; d[k++] = c[2] + pz;
  }
};


/**
 * Computes the closest point on the active rig axis from the ray.
 *
 * @private
 * @param {!goog.vec.Ray}  ray
 */
shapy.editor.Rig.prototype.getClosest_ = function(ray) {
  var u = goog.vec.Vec3.createFloat32();

  // Get the direction vector of the rig axis.
  if (this.select_.x) {
    goog.vec.Vec3.setFromValues(u, 1, 0, 0);
  } else if (this.select_.y) {
    goog.vec.Vec3.setFromValues(u, 0, 1, 0);
  } else {
    goog.vec.Vec3.setFromValues(u, 0, 0, 1);
  }

  return shapy.editor.geom.getClosest(
      new goog.vec.Ray(this.object.getPosition(), u), ray).p0;
};


/**
 * Renders the rig.
 */
shapy.editor.Rig.prototype.render = goog.abstractMethod;


/**
 * Handles mouse move event.
 */
shapy.editor.Rig.prototype.mouseMove = goog.abstractMethod;


/**
 * Handles mouse down event.
 */
shapy.editor.Rig.prototype.mouseDown = goog.abstractMethod;


/**
 * Handles mouse up event.
 */
shapy.editor.Rig.prototype.mouseUp = goog.abstractMethod;


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.prototype.mouseLeave = goog.abstractMethod;


/**
 * Handles mouse enter event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.prototype.mouseEnter = function(ray) {
};



/**
 * List of rig types.
 * @enum {string}
 */
shapy.editor.Rig.Type = {
  TRANSLATE: 'translate',
  ROTATE: 'rotate',
  SCALE: 'scale',
  CUT: 'cut'
};
