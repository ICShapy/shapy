// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Rig');
goog.provide('shapy.editor.Rig.Rotate');
goog.provide('shapy.editor.Rig.Scale');
goog.provide('shapy.editor.Rig.Translate');

goog.require('shapy.editor.geom');



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
  /** @public {shapy.editor.Rig.Type} @const */
  this.type = type;
  /** @private {WebGLBuffer} */
  this.mesh_ = null;
  /** @private {!goog.vec.Mat4.Type} @const */
  this.model_ = goog.vec.Mat4.createFloat32Identity();
  /** @private {{ x: boolean, y: boolean, z: boolean}} @const */
  this.hover_ = {
    x: false,
    y: false,
    z: false
  };
  /** @private {{ x: boolean, y: boolean, z: boolean}} @const */
  this.select_ = {
    x: false,
    y: false,
    z: false
  };
  // TODO: have the control object hold position.
  /** @private {!goog.vec.Vec3.Type} */
  this.position_ = goog.vec.Vec3.createFloat32FromValues(-0.5, 0.2, -0.5);
  // TODO: have rig retrieve this from control object.
  this.getPosition_ = function() {
    return this.position_;
  };
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
 * @param {!goog.vec.Ray}  ray
 */
shapy.editor.Rig.prototype.getClosest_ = function(ray) {
  var closest = goog.vec.Vec3.createFloat32();
  var pos = this.getPosition_();
  var u = goog.vec.Vec3.createFloat32();

  // Get the direction vector of the rig axis.
  if (this.select_.x) {
    goog.vec.Vec3.setFromValues(u, 1, 0, 0);
  } else if (this.select_.y) {
    goog.vec.Vec3.setFromValues(u, 0, 1, 0);
  } else {
    goog.vec.Vec3.setFromValues(u, 0, 0, 1);
  }

  // Compute the closest point.
  var w = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.subtract(pos, ray.origin, w);

  var a = goog.vec.Vec3.dot(u, u);
  var b = goog.vec.Vec3.dot(u, ray.dir);
  var c = goog.vec.Vec3.dot(ray.dir, ray.dir);
  var d = goog.vec.Vec3.dot(u, w);
  var e = goog.vec.Vec3.dot(ray.dir, w);

  var s = (b * e - c * d) / (a * c - b * b);
  goog.vec.Vec3.scale(u, s, u);
  goog.vec.Vec3.add(pos, u, closest);

  return closest;
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
  SCALE: 'scale'
};



/**
 * Rig used to alter position / translate objects.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Translate = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.TRANSLATE);

  /**
   * @private {goog.vec.Vec3.Type}
   */
  this.lastPos_ = goog.vec.Vec3.createFloat32();
};
goog.inherits(shapy.editor.Rig.Translate, shapy.editor.Rig);


/**
 * Number of points used for the base of the arrowhead.
 * @type {number} @const
 */
shapy.editor.Rig.Translate.CIRCLE = 16;


/**
 * Creates the mesh for the rig.
 *
 * @private
 *
 * @param {!WebGLContext}        gl WebGL context.
 */
shapy.editor.Rig.Translate.prototype.build_ = function(gl) {
  // Construct the arrows.
  var d = new Float32Array(shapy.editor.Rig.Translate.CIRCLE * 36 + 108 + 6);
  var angle = 2 * Math.PI / shapy.editor.Rig.Translate.CIRCLE;
  var k = 0;

  // Construct the tube.
  this.buildTube_(
      d, k, shapy.editor.Rig.Translate.CIRCLE, 1.0, 0.02, [0.0, 0.0, 0.0]);
  k += shapy.editor.Rig.Translate.CIRCLE * 18;

  // Construct the arrowhead.
  for (var i = 0; i < shapy.editor.Rig.Translate.CIRCLE; i++) {
    var py = 0.05 * Math.sin(i * angle);
    var pz = 0.05 * Math.cos(i * angle);
    var cy = 0.05 * Math.sin((i + 1) * angle);
    var cz = 0.05 * Math.cos((i + 1) * angle);

    d[k++] = 1.000; d[k++] = py;  d[k++] = pz;
    d[k++] = 1.000; d[k++] = 0.0; d[k++] = 0.0;
    d[k++] = 1.000; d[k++] = cy;  d[k++] = cz;

    d[k++] = 1.125; d[k++] = 0.0; d[k++] = 0.0;
    d[k++] = 1.000; d[k++] = py;  d[k++] = pz;
    d[k++] = 1.000; d[k++] = cy;  d[k++] = cz;
  }

  // Construct a cube on the origin.
  this.buildCube_(d, k, 0.05);
  k += 108;

  // Line through the arrow.
  d[k++] = -1000.0; d[k++] = 0.0; d[k++] = 0.0;
  d[k++] =  1000.0; d[k++] = 0.0; d[k++] = 0.0;

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Translate.prototype.render = function(gl, sh) {
  var pos = this.getPosition_();

  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  // Arrow on X.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.x) {
    sh.uniform4f('u_colour', 1.0, 0.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.7, 0.0, 0.0, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Translate.CIRCLE * 12);

  // Line on X.
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 0.271, 0.0, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Translate.CIRCLE * 12 + 36, 2);
  }

  // Arrow on Y.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.rotateZ(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.y) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.y) {
    sh.uniform4f('u_colour', 0.2, 0.5, 1.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.0, 0.7, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Translate.CIRCLE * 12);

  // Line on Y.
  if (this.select_.y) {
    sh.uniform4f('u_colour', 0.255, 0.412, 0.882, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Translate.CIRCLE * 12 + 36, 2);
  }

  // Arrow on Z.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.rotateY(this.model_, -Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.z) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.z) {
    sh.uniform4f('u_colour', 0.0, 1.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.7, 0.0, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Translate.CIRCLE * 12);

  // Line on Z.
  if (this.select_.z) {
    sh.uniform4f('u_colour', 0.196, 0.804, 0.196, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Translate.CIRCLE * 12 + 36, 2);
  }

  // Box on the origin.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  sh.uniformMat4x4('u_model', this.model_);
  sh.uniform4f('u_colour', 1, 1, 0, 1);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Translate.CIRCLE * 12, 36);

  gl.disableVertexAttribArray(0);
};


/**
 * Determines if the ray intersects the sphere.
 *
 * @param {!goog.vec.Ray}  ray Ray
 * @param {!goog.vec.Vec3} c   Center of the sphere.
 * @param {number}         r   Radius of the sphere.
 */
shapy.editor.intersectSphere = function(ray, c, r) {
  var origC = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.subtract(c, ray.origin, origC);

  var cross = goog.vec.Vec3.createFloat32();
  goog.vec.Vec3.cross(ray.dir, origC, cross);

  return goog.vec.Vec3.magnitude(cross) <= r;
};


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Translate.prototype.mouseMove = function(ray) {
  var pos = this.getPosition_();

  if (this.select_.x || this.select_.y || this.select_.z) {
    // Calculate the translation.
    var t = goog.vec.Vec3.createFloat32();
    var currPos = this.getClosest_(ray);
    goog.vec.Vec3.subtract(currPos, this.lastPos_, t);
    this.lastPos_ = currPos;
    // Update the position.
    goog.vec.Vec3.add(pos, t, pos);
    return;
  }

  var c = goog.vec.Vec3.createFloat32();

  // Find intersection with X arrow.
  goog.vec.Vec3.setFromValues(c, pos[0] + 1.1, pos[1], pos[2]);
  this.hover_.x = shapy.editor.intersectSphere(ray, c, 0.1);

  // Find intersection with Y arrow.
  goog.vec.Vec3.setFromValues(c, pos[0], pos[1] + 1.1, pos[2]);
  this.hover_.y = shapy.editor.intersectSphere(ray, c, 0.1);

  // Find intersection with Z arrow.
  goog.vec.Vec3.setFromValues(c, pos[0], pos[1], pos[2] + 1.1);
  this.hover_.z = shapy.editor.intersectSphere(ray, c, 0.1);
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Translate.prototype.mouseDown = function(ray) {
  this.select_.x = this.hover_.x;
  this.select_.y = this.hover_.y;
  this.select_.z = this.hover_.z;
  this.lastPos_ = this.getClosest_(ray);
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Translate.prototype.mouseUp = function(ray) {
  this.select_.x = this.select_.y = this.select_.z = false;
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Translate.prototype.mouseLeave = function() {
  this.select_.x = this.select_.y = this.select_.z = false;
};



/**
 * Rig used to alter rotation.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Rotate = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.ROTATE);
  /** @private {!goog.vec.Vec3.Type} */
  this.normal_ = goog.vec.Vec3.createFloat32();
  /** @private {goog.vec.Vec3.Type} */
  this.cursor_ = goog.vec.Vec3.createFloat32();
  /** @private {number} */
  this.startAngle_ = 0.0;
  /** @private {number} */
  this.currentAngle_ = 0.0;
};
goog.inherits(shapy.editor.Rig.Rotate, shapy.editor.Rig);


/** @type {number} @const */
shapy.editor.Rig.Rotate.SEGMENTS = 64;
/** @type {number} @const */
shapy.editor.Rig.Rotate.DISK =
    shapy.editor.Rig.Rotate.SEGMENTS *
    18;
/** @type {number} @const */
shapy.editor.Rig.Rotate.RADIUS = 0.03;



/**
 * Creates the mesh for the rig.
 *
 * @private
 *
 * @param {!WebGLContext}        gl WebGL context.
 */
shapy.editor.Rig.Rotate.prototype.build_ = function(gl) {
  var d = new Float32Array(shapy.editor.Rig.Rotate.DISK * 3);
  var dp = 2 * Math.PI / shapy.editor.Rig.Rotate.SEGMENTS;
  var k = 0;

  var emit = function(p, t) {
    d[k++] = Math.cos(p) * (1 + shapy.editor.Rig.Rotate.RADIUS * t);
    d[k++] = 0;
    d[k++] = Math.sin(p) * (1 + shapy.editor.Rig.Rotate.RADIUS * t);
  };

  for (var i = 0; i < shapy.editor.Rig.Rotate.SEGMENTS; ++i) {
    var p0 = (i + 0) * dp, p1 = (i + 1) * dp;
    emit(p0, -1);
    emit(p0, 1);
    emit(p1, 1);
    emit(p0, -1);
    emit(p1, 1);
    emit(p1, -1);
  }

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Rotate.prototype.render = function(gl, sh) {
  var i = shapy.editor.Rig.Rotate.DISK / 3;
  var pos = this.getPosition_();

  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  // Y ring.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.y) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.y) {
    sh.uniform4f('u_colour', 0.2, 0.5, 1.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.0, 0.7, 1.0);
  }
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  // X ring.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.rotateZ(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.x) {
    sh.uniform4f('u_colour', 1.0, 0.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.7, 0.0, 0.0, 1.0);
  }
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  // Z ring.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.rotateX(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.z) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.z) {
    sh.uniform4f('u_colour', 0.0, 1.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.7, 0.0, 1.0);
  }
  gl.drawArrays(goog.webgl.TRIANGLES, i * 0, i);

  // Cursor.
  if (this.select_.x || this.select_.y || this.select_.z) {
    var r = (1.0 - shapy.editor.Rig.Rotate.RADIUS);
    gl.lineWidth(2.0);
    goog.vec.Mat4.makeIdentity(this.model_);
    sh.uniformMat4x4('u_model', this.model_);

    var tmp = gl.createBuffer();
    gl.bindBuffer(goog.webgl.ARRAY_BUFFER, tmp);

    // Line to the cursor.
    gl.bufferData(goog.webgl.ARRAY_BUFFER, new Float32Array([
        pos[0], pos[1], pos[2],
        this.cursor_[0], this.cursor_[1], this.cursor_[2]
    ]), goog.webgl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
    gl.drawArrays(goog.webgl.LINES, 0, 2);

    // Start marker & triangle fan for shaded region.
    var seg = shapy.editor.Rig.Rotate.SEGMENTS;
    var data = new Float32Array(9 + (seg + 1) * 3);
    var k = 0;

    data[k++] = pos[0];
    data[k++] = pos[1];
    data[k++] = pos[2];

    if (this.select_.x) {
      data[k++] = pos[0] + 0.0;
      data[k++] = pos[1] + r * Math.cos(this.startAngle_);
      data[k++] = pos[2] + r * Math.sin(this.startAngle_);
    } else if (this.select_.y) {
      data[k++] = pos[0] + r * Math.cos(this.startAngle_);
      data[k++] = pos[1] + 0.0;
      data[k++] = pos[2] + r * Math.sin(this.startAngle_);
    } else {
      data[k++] = pos[0] + r * Math.cos(this.startAngle_);
      data[k++] = pos[1] + r * Math.sin(this.startAngle_);
      data[k++] = pos[2] + 0.0;
    }

    data[k++] = pos[0];
    data[k++] = pos[1];
    data[k++] = pos[2];

    var dp = (this.currentAngle_ - this.startAngle_) / seg;
    for (var i = 0; i <= seg + 1; ++i) {
      var p = this.startAngle_ + i * dp;
      if (this.select_.x) {
        data[k++] = pos[0] + 0.0;
        data[k++] = pos[1] + r * Math.cos(p);
        data[k++] = pos[2] + r * Math.sin(p);
      } else if (this.select_.y) {
        data[k++] = pos[0] + r * Math.cos(p);
        data[k++] = pos[1] + 0.0;
        data[k++] = pos[2] + r * Math.sin(p);
      } else {
        data[k++] = pos[0] + r * Math.cos(p);
        data[k++] = pos[1] + r * Math.sin(p);
        data[k++] = pos[2] + 0.0;
      }
    }

    gl.bufferData(goog.webgl.ARRAY_BUFFER, data, goog.webgl.STREAM_DRAW);
    sh.uniform4f('u_colour', 0.0, 0.0, 0.0, 1.0);
    gl.drawArrays(goog.webgl.LINES, 0, 2);
    sh.uniform4f('u_colour', 0.2, 0.2, 0.2, 0.5);
    gl.drawArrays(goog.webgl.TRIANGLE_FAN, 2, 2 + seg);

    gl.bindBuffer(goog.webgl.ARRAY_BUFFER, null);
    gl.deleteBuffer(tmp);
  }

  gl.disableVertexAttribArray(0);
};


/**
 * Adjusts the cursor if it is inside the ring to touch the inner edge.
 *
 * @private
 *
 * @param {!goog.vec.Vec3.Type} cursor
 */
shapy.editor.Rig.Rotate.prototype.adjustCursor_ = function(cursor) {
  var d, r, pos = this.getPosition_();

  goog.vec.Vec3.subtract(cursor, pos, cursor);
  d = goog.vec.Vec3.magnitude(cursor);
  if (d < 1.0) {
    r = 1.0 - shapy.editor.Rig.Rotate.RADIUS;
    goog.vec.Vec3.scale(cursor, r / d, cursor);
  }

  goog.vec.Vec3.add(pos, cursor, cursor);
};


/**
 * Returns the normal vector of the control ring that was hit by a plane.
 *
 * @private
 *
 * @param {!goog.vec.Ray} ray
 *
 * @return {goog.vec.Vec3.Type}
 */
shapy.editor.Rig.Rotate.prototype.getHit_ = function(ray) {
  var position = this.getPosition_();

  // Find intersection point with planes.
  var ix = shapy.editor.geom.intersectPlane(ray, [1, 0, 0], position);
  var iy = shapy.editor.geom.intersectPlane(ray, [0, 1, 0], position);
  var iz = shapy.editor.geom.intersectPlane(ray, [0, 0, 1], position);

  // Find distance between center and intersection point.
  var cx = goog.vec.Vec3.distance(ix, position);
  var cy = goog.vec.Vec3.distance(iy, position);
  var cz = goog.vec.Vec3.distance(iz, position);

  // Find distance to intersection points.
  var ex = goog.vec.Vec3.distance(ix, ray.origin);
  var ey = goog.vec.Vec3.distance(iy, ray.origin);
  var ez = goog.vec.Vec3.distance(iz, ray.origin);

  // Choose the best match - closest to origin.
  var hits = [
      [[1, 0, 0], cx, ex, ix],
      [[0, 1, 0], cy, ey, iy],
      [[0, 0, 1], cz, ez, iz]
  ];
  hits = goog.array.filter(hits, function(e) {
      return Math.abs(e[1] - 1.0) < shapy.editor.Rig.Rotate.RADIUS;
  }, this);
  goog.array.sort(hits, function(e1, e2) { return e1[2] - e2[2]; }, this);

  // If no hits, return
  if (goog.array.isEmpty(hits)) {
    return null;
  }
  return hits[0];
};


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseMove = function(ray) {
  var pos = this.getPosition_();
  if (this.select_.x || this.select_.y || this.select_.z) {
    this.cursor_ = shapy.editor.geom.intersectPlane(ray, this.normal_, pos);
    this.adjustCursor_(this.cursor_);
    this.currentAngle_ = this.getAngle_(this.cursor_);
    return;
  }

  var hit = this.getHit_(ray);
  if (!hit) {
    this.hover_.x = this.hover_.y = this.hover_.z = false;
    return;
  }

  this.normal_ = hit[0];
  this.hover_.x = hit[0][0] != 0;
  this.hover_.y = hit[0][1] != 0;
  this.hover_.z = hit[0][2] != 0;
};


/**
 * Returns the rotation angle.
 *
 * @private
 *
 * @param {goog.vec.Vec3.Type} cursor
 *
 * @return {number}
 */
shapy.editor.Rig.Rotate.prototype.getAngle_ = function(cursor) {
  var pos = this.getPosition_();

  if (this.hover_.x) {
    return Math.atan2(
        this.cursor_[2] - pos[2],
        this.cursor_[1] - pos[1]);
  }
  if (this.hover_.y) {
    return Math.atan2(
        this.cursor_[2] - pos[2],
        this.cursor_[0] - pos[0]);
  }
  if (this.hover_.z) {
    return Math.atan2(
        this.cursor_[1] - pos[1],
        this.cursor_[0] - pos[0]);
  }
  return 0.0;
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseDown = function(ray) {
  var pos = this.getPosition_();
  var hit = this.getHit_(ray);
  var dx, dy;

  if (!hit) {
    return;
  }

  this.cursor_ = shapy.editor.geom.intersectPlane(ray, this.normal_, pos);
  this.adjustCursor_(this.cursor_);
  this.startAngle_ = this.currentAngle_ = this.getAngle_(this.cursor_);

  if (this.hover_.x) {
    this.select_.x = true;
    return;
  }
  if (this.hover_.y) {
    this.select_.y = true;
    return;
  }
  if (this.hover_.z) {
    this.select_.z = true;
    return;
  }
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Rotate.prototype.mouseUp = function(ray) {
  this.select_.x = this.select_.y = this.select_.z = false;
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Rotate.prototype.mouseLeave = function() {
  this.select_.x = this.select_.y = this.select_.z = false;
};



/**
 * Rig used to alter scaling.
 *
 * @constructor
 * @extends {shapy.editor.Rig}
 */
shapy.editor.Rig.Scale = function() {
  shapy.editor.Rig.call(this, shapy.editor.Rig.Type.SCALE);

  /**
   * @private {goog.vec.Vec3.Type}
   */
  this.lastPos_ = goog.vec.Vec3.createFloat32();

  /**
   * @private {goog.vec.Vec3.Type}
   */
  this.scale_ = goog.vec.Vec3.createFloat32FromValues(1.0, 1.0, 1.0);
};
goog.inherits(shapy.editor.Rig.Scale, shapy.editor.Rig);


/**
 * Number of points used for the base of the tube.
 * @type {number} @const
 */
shapy.editor.Rig.Scale.TUBE_BASE = 16;


/**
 * Creates the mesh for the rig.
 *
 * @private
 *
 * @param {!WebGLContext}        gl WebGL context.
 */
shapy.editor.Rig.Scale.prototype.build_ = function(gl) {
  var d = new Float32Array(shapy.editor.Rig.Scale.TUBE_BASE * 18 + 18 * 36 + 6);
  var k = 0;

  // Build the tube.
  this.buildTube_(
      d, k, shapy.editor.Rig.Scale.TUBE_BASE, 1.0, 0.015, [0.0, 0.0, 0.0]);
  k += shapy.editor.Rig.Scale.TUBE_BASE * 18;

  // Construct the cube on the tube.
  this.buildCube_(d, k, 0.07);
  k += 108;

  // Construct the cube on the origin.
  this.buildCube_(d, k, 0.05);
  k+= 108;

  // Line through the rig.
  d[k++] = -1000.0; d[k++] = 0.0; d[k++] = 0.0;
  d[k++] =  1000.0; d[k++] = 0.0; d[k++] = 0.0;

  this.mesh_ = gl.createBuffer();
  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.bufferData(goog.webgl.ARRAY_BUFFER, d, goog.webgl.STATIC_DRAW);
};


/**
 * Renders the rig.
 *
 * @param {!WebGLContext}        gl WebGL context.
 * @param {!shapy.editor.Shader} sh Current shader.
 */
shapy.editor.Rig.Scale.prototype.render = function(gl, sh) {
  var pos = this.getPosition_();

  if (!this.mesh_) {
    this.build_(gl);
  }

  gl.enableVertexAttribArray(0);

  gl.bindBuffer(goog.webgl.ARRAY_BUFFER, this.mesh_);
  gl.vertexAttribPointer(0, 3, goog.webgl.FLOAT, false, 12, 0);

  // Tube on X.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, this.scale_[0], 1.0, 1.0);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.x) {
    sh.uniform4f('u_colour', 1.0, 0.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.7, 0.0, 0.0, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Scale.TUBE_BASE * 6);

  // Line on X.
  if (this.select_.x) {
    sh.uniform4f('u_colour', 1.0, 0.271, 0.0, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Scale.TUBE_BASE * 6 + 72, 2);
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  }

  // Box on X.
  goog.vec.Mat4.makeTranslate(
      this.model_, pos[0] + this.scale_[0], pos[1], pos[2]);
  sh.uniformMat4x4('u_model', this.model_);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Scale.TUBE_BASE * 6 , 36);

  // Tube on Y.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, 1.0, this.scale_[1], 1.0);
  goog.vec.Mat4.rotateZ(this.model_, Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.y) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.y) {
    sh.uniform4f('u_colour', 0.2, 0.5, 1.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.0, 0.7, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Scale.TUBE_BASE * 6);

  // Line on Y.
  if (this.select_.y) {
    sh.uniform4f('u_colour', 0.255, 0.412, 0.882, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Scale.TUBE_BASE * 6 + 72, 2);
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  }

  // Box on Y.
  goog.vec.Mat4.makeTranslate(
      this.model_, pos[0], pos[1] + this.scale_[1], pos[2]);
  sh.uniformMat4x4('u_model', this.model_);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Scale.TUBE_BASE * 6 , 36);

  // Tube on Z.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  goog.vec.Mat4.scale(this.model_, 1.0, 1.0, this.scale_[2]);
  goog.vec.Mat4.rotateY(this.model_, -Math.PI / 2);
  sh.uniformMat4x4('u_model', this.model_);
  if (this.select_.z) {
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  } else if (this.hover_.z) {
    sh.uniform4f('u_colour', 0.0, 1.0, 0.0, 1.0);
  } else {
    sh.uniform4f('u_colour', 0.0, 0.7, 0.0, 1.0);
  }
  gl.drawArrays(
      goog.webgl.TRIANGLES, 0, shapy.editor.Rig.Scale.TUBE_BASE * 6);

  // Line on Z.
  if (this.select_.z) {
    sh.uniform4f('u_colour', 0.196, 0.804, 0.196, 1.0);
    gl.drawArrays(
        goog.webgl.LINES, shapy.editor.Rig.Scale.TUBE_BASE * 6 + 72, 2);
    sh.uniform4f('u_colour', 1.0, 1.0, 0.0, 1.0);
  }

  // Box on Z.
  goog.vec.Mat4.makeTranslate(
      this.model_, pos[0], pos[1], pos[2] + this.scale_[2]);
  sh.uniformMat4x4('u_model', this.model_);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Scale.TUBE_BASE * 6 , 36);

  // Box on the origin.
  goog.vec.Mat4.makeTranslate(this.model_, pos[0], pos[1], pos[2]);
  sh.uniformMat4x4('u_model', this.model_);
  sh.uniform4f('u_colour', 1, 1, 0, 1);
  gl.drawArrays(
      goog.webgl.TRIANGLES, shapy.editor.Rig.Scale.TUBE_BASE * 6 + 36, 36);

  gl.disableVertexAttribArray(0);
};


/**
 * Determines if the ray intersects the axis-aligned cube using a modified
 * version of Smits' algorithm.
 * // TODO: change algorithm to include non axis-aligned boxes
 *
 * @param {!goog.vec.Ray}  ray Ray
 * @param {!goog.vec.Vec3} c   Center of the cube.
 * @param {number}         a   Length of the edge.
 */
shapy.editor.intersectCube = function(ray, c, a) {
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


/**
 * Handles mouse move event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Scale.prototype.mouseMove = function(ray) {
  if (this.select_.x || this.select_.y || this.select_.z) {
    // Calculate the movement.
    var d = goog.vec.Vec3.createFloat32();
    var currPos = this.getClosest_(ray);
    goog.vec.Vec3.subtract(currPos, this.lastPos_, d);
    this.lastPos_ = currPos;

    // Update the scale.
    goog.vec.Vec3.add(this.scale_, d, this.scale_);
    return;
  }

  var pos = this.getPosition_();
  var c = goog.vec.Vec3.createFloat32();

  // Intersection on X.
  goog.vec.Vec3.setFromValues(c, pos[0] + this.scale_[0], pos[1], pos[2]);
  this.hover_.x = shapy.editor.intersectCube(ray, c, 0.1);

  // Intersection on Y.
  goog.vec.Vec3.setFromValues(c, pos[0], pos[1] + this.scale_[1], pos[2]);
  this.hover_.y = shapy.editor.intersectCube(ray, c, 0.1);

  // Intersection on Z.
  goog.vec.Vec3.setFromValues(c, pos[0], pos[1], pos[2] + this.scale_[2]);
  this.hover_.z = shapy.editor.intersectCube(ray, c, 0.1);
};


/**
 * Handles mouse down event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Scale.prototype.mouseDown = function(ray) {
  this.select_.x = this.hover_.x;
  this.select_.y = this.hover_.y;
  this.select_.z = this.hover_.z;
  this.lastPos_ = this.getClosest_(ray);
};


/**
 * Handles mouse up event.
 *
 * @param {!goog.vec.Ray} ray
 */
shapy.editor.Rig.Scale.prototype.mouseUp = function(ray) {
  this.select_.x = this.select_.y = this.select_.z = false;

  // Reset the scale.
  goog.vec.Vec3.setFromValues(this.scale_, 1.0, 1.0, 1.0);
};


/**
 * Handles mouse leave event.
 */
shapy.editor.Rig.Scale.prototype.mouseLeave = function() {
  this.select_.x = this.select_.y = this.select_.z = false;

  // Reset the scale.
  goog.vec.Vec3.setFromValues(this.scale_, 1.0, 1.0, 1.0);
};
