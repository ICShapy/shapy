// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Executor');



/**
 * Handles all communication with the server. Applies changes to the scene.
 *
 * @param {!shapy.editor.Scene} scene
 * @param {!shapy.editor.Editor} editor
 *
 * @constructor
 */
shapy.editor.Executor = function(scene, editor) {
  /** @private {!shapy.editor.Scene} @const */
  this.scene_ = scene;
  /** @private {!shapy.editor.Editor} @const */
  this.editor_ = editor;

  /**
   * Pending requests.
   * @private {!Array<Object>}
   */
  this.pending_ = [];

  /**
   * WebSocket connection.
   * @private {WebSocket}
   */
  this.sock_ = new WebSocket(goog.string.format('ws://%s:%d/api/edit/%s',
      this.editor_.location_.host(),
      this.editor_.location_.port(),
      this.scene_.id));
  this.sock_.onmessage = goog.bind(this.onMessage_, this);
  this.sock_.onclose = goog.bind(this.onClose_, this);
  this.sock_.onopen = goog.bind(this.onOpen_, this);
};


/**
 * Closes the connection.
 */
shapy.editor.Executor.prototype.destroy = function() {
  if (this.sock_) {
    this.sock_.close();
    this.sock_ = null;
  }
};


/**
 * Called when the connection opens - flushes pending requests.
 *
 * @private
 */
shapy.editor.Executor.prototype.onOpen_ = function() {
  goog.array.map(this.pending_, function(message) {
    this.sock_.send(JSON.stringify(message));
  }, this);
};


/**
 * Called when the server suspends the connection.
 *
 * @private
 *
 * @param {CloseEvent} evt
 */
shapy.editor.Executor.prototype.onClose_ = function(evt) {
  this.sock_ = null;
};


/**
 * Sends a command over websockets.
 *
 * @param {Object} data
 */
shapy.editor.Executor.prototype.sendCommand = function(data) {
  if (!this.sock_ || this.sock_.readyState != 1) {
    this.pending_.push(data);
    return;
  }

  this.sock_.send(JSON.stringify(data));
};


/**
 * Called on the receipt of a message from the server.
 *
 * @private
 *
 * @param {MessageEvent} evt
 */
shapy.editor.Executor.prototype.onMessage_ = function(evt) {
  var data;

  // Try to make sense of the data.
  try {
    data = JSON.parse(evt.data);
  } catch (e) {
    console.error('Invalid message: ' + evt.data);
  }

  this.editor_.rootScope_.$apply(goog.bind(function() {
    switch (data['type']) {
      case 'create': this.applyCreate(data); return;
      case 'lock': this.applyLock(data); return;
      case 'unlock': this.applyUnlock(data); return;
      case 'leave': this.applyLeave(data); return;
      case 'name': {
        if (this.scene_.name != data['value']) {
          this.scene_.name = data['value'];
        }
        break;
      }
      case 'join': {
        this.scene_.addUser(data['user']);
        break;
      }
      case 'meta': {
        this.scene_.name = data['name'];
        this.scene_.setUsers(data['users']);
        break;
      }
      case 'edit': {
        switch (data['tool']) {
          case 'translate': {
            this.applyTranslate(data);
            break;
          }
          case 'rotate': {
            this.applyRotate(data);
            break;
          }
          case 'scale': {
            this.applyScale(data);
            break;
          }
          case 'delete': {
            this.applyDelete(data);
            break;
          }
          default: {
            console.error('Invalid tool "' + data['tool'] + "'");
            break;
          }
        }
        break;
      }
      default: {
        console.error('Invalid message type "' + data['type'] + '"');
        break;
      }
    }
  }, this));
};


/**
 * Executes the create command.
 *
 * @param {string} type
 */
shapy.editor.Executor.prototype.emitCreate = function(type) {
  this.sendCommand({
    type: 'create',
    object: type
  });
};


/**
 * Handles the confirmation for create.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyCreate = function(data) {
  switch (data['object']) {
    case 'cube': {
      this.scene_.createCube(0.5, 0.5, 0.5);
      break;
    }
    case 'sphere': {
      this.scene_.createSphere(0.5, 16, 16);
      break;
    }
    default: {
      console.error('Invalid object type "' + data['object'] + "'");
      return;
    }
  }
  this.editor_.mode.setObject();
};


/**
 * Executes the select command.
 *
 * @param {!Array<!shapy.editor.Object>} toLock
 * @param {!Array<!shapy.editor.Object>} toUnlock
 */
shapy.editor.Executor.prototype.emitSelect = function(toLock, toUnlock) {
  if (!goog.array.isEmpty(toLock)) {
    this.sendCommand({
      type: 'lock',
      user: this.editor_.user.id,
      objects: goog.array.map(toLock, function(object) {
        return object.id;
      })
    });
  }

  if (!goog.array.isEmpty(toUnlock)) {
    this.sendCommand({
      type: 'unlock',
      user: this.editor_.user.id,
      objects: goog.array.map(toUnlock, function(object) {
        return object.id;
      })
    });
  }
};


/**
 * Handles acquired locks for selection.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyLock = function(data) {
  this.editor_.shUser_.get(data['user']).then(goog.bind(function(user) {
    goog.array.forEach(data['objects'], function(id) {
      if (!goog.object.containsKey(this.scene_.objects, id)) {
        console.log('Invalid object "' + id + "'");
        return;
      }
      if (user.id == this.editor_.user.id) {
        this.editor_.objectGroup_.add([this.scene_.objects[id]]);
      }
      this.scene_.objects[id].setSelected(user);
    }, this);
  }, this));
};


/**
 * Handles released locks for selection.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyUnlock = function(data) {
  goog.array.forEach(data['objects'], function(id) {
    if (!goog.object.containsKey(this.scene_.objects, id)) {
      console.log('Invalid object "' + id + "'");
      return;
    }
    this.editor_.objectGroup_.remove([this.scene_.objects[id]]);
    this.scene_.objects[id].setSelected(null);
  }, this);
};


/**
 * Handles a leave message.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyLeave = function(data) {
  this.scene_.removeUser(data['user']);
  goog.object.forEach(this.scene_.objects, function(object) {
    if (object.selected && object.selected.id == data['user']) {
      object.setSelected(null);
    }
  }, this);
};


/**
 * Executes the translate command.
 *
 * @param {shapy.editor.Editable.Type} obj Object to be translated.
 * @param {number}                   dx    Delta on x.
 * @param {number}                   dy    Delta on y.
 * @param {number}                   dz    Delta on z.
 */
shapy.editor.Executor.prototype.emitTranslate = function(obj, dx, dy, dz) {
  var data = {
    type: 'edit',
    tool: 'translate',
    userId: this.editor_.user.id,

    dx: dx,
    dy: dy,
    dz: dz,

    objMode: this.editor_.mode.object
  };

  // Object group.
  if (this.editor_.mode.object) {
    data.ids = obj.getObjIds();
  } else {
    // Parts group.
    data.ids = obj.getObjVertIds();
  }

  this.sendCommand(data);
};


/**
 * Handles translate command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyTranslate = function(data) {
  // Ignore edits performed by the current user.
  if (data['userId'] == this.editor_.user.id) {
    return;
  }

  // Translate objects/ parts.
  if (data['objMode']) {
    goog.array.forEach(data['ids'], function(id) {
      this.scene_.objects[id].translate(data['dx'], data['dy'], data['dz']);
    }, this);
  } else {
    goog.array.forEach(data['ids'], function(p) {
      this.scene_.objects[p[0]].verts[p[1]].translate(
          data['dx'], data['dy'], data['dz']);
    }, this);
  }
};


/**
 * Executes the rotate command.
 *
 * @param {shapy.editor.Editable.Type} obj
 * @param {number}                     x
 * @param {number}                     y
 * @param {number}                     z
 * @param {number}                     w
 */
shapy.editor.Executor.prototype.emitRotate = function(obj, x, y, z, w) {
  var mid = obj.getPosition();

  var data = {
    type: 'edit',
    tool: 'rotate',
    userId: this.editor_.user.id,

    mx: mid[0],
    my: mid[1],
    mz: mid[2],

    x: x,
    y: y,
    z: z,
    w: w,

    objMode: this.editor_.mode.object
  };

  // Objects group
  if (this.editor_.mode.object) {
    data.ids = obj.getObjIds();
  } else {
    // Parts group rotation to be implemented.
  }

  this.sendCommand(data);
};


/**
 * Handles rotate command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyRotate = function(data) {
  // Ignore edits performed by the current user.
  if (data['userId'] == this.editor_.user.id) {
    return;
  }

  // Construct the rotation quaternion.
  var quat = goog.vec.Quaternion.createFloat32FromValues(
      data['x'],
      data['y'],
      data['z'],
      data['w']
  );

  // Retrieve the group middle.
  var mid = goog.vec.Vec3.createFloat32FromValues(
      data['mx'], data['my'], data['mz']);

  var c = goog.vec.Quaternion.createFloat32();
  var d = goog.vec.Vec3.createFloat32();
  var dq = goog.vec.Quaternion.createFloat32();
  goog.vec.Quaternion.conjugate(quat, c);

  // Rotate objects/ parts.
  if (data['objMode']) {
    goog.array.forEach(data.ids, function(id) {
      goog.vec.Vec3.subtract(this.scene_.objects[id].getPosition(), mid, d);

      // Compute the rotation quaternion.
      goog.vec.Quaternion.setFromValues(dq, d[0], d[1], d[2], 0.0);
      goog.vec.Quaternion.concat(quat, dq, dq);
      goog.vec.Quaternion.concat(dq, c, dq);

      // Translate and rotate.
      this.scene_.objects[id].translate(
          dq[0] - d[0],
          dq[1] - d[1],
          dq[2] - d[2]
      );
      this.scene_.objects[id].rotate(quat);
    }, this);
  } else {
    // To be implemented.
  }
};


/**
 * Executed the scale command.
 *
 * @param {shapy.editor.Editable.Type} obj
 * @param {number}                     sx
 * @param {number}                     sy
 * @param {number}                     sz
 */
shapy.editor.Executor.prototype.emitScale = function(obj, sx, sy, sz) {
  var mid = obj.getPosition();

  var data = {
    type: 'edit',
    tool: 'scale',
    userId: this.editor_.user.id,

    mx: mid[0],
    my: mid[1],
    mz: mid[2],

    sx: sx,
    sy: sy,
    sz: sz,

    objMode: this.editor_.mode.object
  };

  // Objects group
  if (this.editor_.mode.object) {
    data.ids = obj.getObjIds();
  } else {
    // Parts group scaling to be implemented.
  }

  this.sendCommand(data);
};


/**
 * Handles scale command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyScale = function(data) {
  // Ignore edits performed by the current user.
  if (data['userId'] == this.editor_.user.id) {
    return;
  }

  var mid = goog.vec.Vec3.createFloat32FromValues(
      data['mx'], data['my'], data['mz']);
  var d = goog.vec.Vec3.createFloat32();

  // Scale objects/ parts.
  if (data['objMode']) {
    goog.array.forEach(data.ids, function(id) {
      goog.vec.Vec3.subtract(this.scene_.objects[id].getPosition(), mid, d);

      this.scene_.objects[id].translate(
          d[0] * data['sx'] - d[0],
          d[1] * data['sy'] - d[1],
          d[2] * data['sz'] - d[2]
      );
      this.scene_.objects[id].scale(data['sx'], data['sy'], data['sz']);
    }, this);
  } else {
    // To be implemented.
  }
};


/**
 * Executes delete command.
 *
 * @param {shapy.editor.Editable}
 */
shapy.editor.Executor.prototype.emitDelete = function(obj) {
  var data = {
    type: 'edit',
    tool: 'delete',
    userId: this.editor_.user.id,

    objMode: this.editor_.mode.object
  };

  // Object group.
  if (this.editor_.mode.object) {
    data.ids = obj.getObjIds();
  } else {
    // Parts group.
    data.ids = obj.getObjPartIds();
  }

  this.sendCommand(data);
};


/**
 * Handles delete command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyDelete = function(data) {
  // Ignore edits performed by the current user.
  if (data['userId'] == this.editor_.user.id) {
    return;
  }

  // Delete objects.
  if (data['objMode']) {
    goog.array.forEach(data['ids'], function(id) {
      this.scene_.objects[id].delete();
    }, this);
  } else {
    // Delete parts.
    goog.array.forEach(data['ids'], function(t) {
      var obj = this.scene_.objects[t[0]];

      switch (t[2]) {
        case 'vertex': {
          obj.verts[t[1]].delete();
          break;
        }
        case 'edge': {
          if (obj.edges[t[1]]) {
            obj.edges[t[1]].delete();
          }
          break;
        }
        case 'face': {
          if (obj.faces[t[1]]) {
            obj.faces[t[1]].delete();
          }
          break;
        }
        default: {
          console.error('Invalid part type "' + t[2] + '"');
        }
      }
    }, this);
  }
};
