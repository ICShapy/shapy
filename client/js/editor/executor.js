// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Executor');



/**
 * Handles all communication with the server. Applies changes to the scene.
 *
 * @param {!shapy.editor.Scene} scene
 * @param {!shapy.editor.Editor} editor
 * @param {!shapy.editor.Executor.Type} type
 *
 * @constructor
 */
shapy.editor.Executor = function(scene, editor, type) {
  /** @public {!shapy.editor.Executor.Type} @const */
  this.type = type;
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
      case 'message': this.applyMessage(data); return;
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
          case 'extrude': {
            this.applyExtrude(data);
            break;
          }
          case 'connect': {
            this.applyConnect(data);
            break;
          }
          case 'merge': {
            this.applyMerge(data);
            break;
          }
          case 'paint': {
            this.applyPaint(data);
            break;
          }
          case 'texture': {
            this.applyTexture(data);
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
 * Executes a chat message
 *
 * @param {string} message
 */
shapy.editor.Executor.prototype.emitMessage = function(message) {
  this.sendCommand({
    type: 'message',
    user: this.editor_.user.id,
    message: message
  });
};


/**
 * Receives a chat message.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyMessage = function(data) {
  this.editor_.shUser_.get(data['user']).then(goog.bind(function(user) {
    // Add to message list
    var ml = this.editor_.messageList;
    if (ml.length == 0) {
      ml.push({
        user: user,
        messages: [data['message']]
      });
    } else if (ml[ml.length - 1].user.id == user.id) {
      ml[ml.length - 1].messages.push(data['message']);
    } else {
      ml.push({
        user: user,
        messages: [data['message']]
      });
    }

    // Increment unread counter
    if (!$('#chatbox').is(':visible')) {
      this.editor_.unreadMessages++;
    }
  }, this));
};


/**
 * Executes the create command.
 *
 * @param {string} type
 */
shapy.editor.Executor.prototype.emitCreate = function(type) {

};


/**
 * Handles the confirmation for create.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyCreate = function(data) {
  switch (data['object']) {
    case 'cube': {
      this.scene_.createCube(0.5, 0.5, 0.5, data['seq']);
      break;
    }
    case 'sphere': {
      this.scene_.createSphere(0.5, 16, 16, data['seq']);
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

      if (this.editor_.user && user.id == this.editor_.user.id) {
        this.editor_.objectGroup.add([this.scene_.objects[id]]);
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
    this.editor_.objectGroup.remove([this.scene_.objects[id]]);
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
 * @param {number}                     dx  Delta on x.
 * @param {number}                     dy  Delta on y.
 * @param {number}                     dz  Delta on z.
 */
shapy.editor.Executor.prototype.emitTranslate = function(obj, dx, dy, dz) {

};


/**
 * Handles translate command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyTranslate = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
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

};


/**
 * Handles rotate command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyRotate = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
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
    goog.array.forEach(data['ids'], function(id) {
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
    goog.array.forEach(data['ids'], function(p) {
      var vert = this.scene_.objects[p[0]].verts[p[1]];

      // Compute distance from the middle.
      goog.vec.Vec3.subtract(vert.getPosition(), mid, d);

      // Compue teh rotation quaternion.
      goog.vec.Quaternion.setFromValues(dq, d[0], d[1], d[2], 0.0);
      goog.vec.Quaternion.concat(quat, dq, dq);
      goog.vec.Quaternion.concat(dq, c, dq);

      // Translate.
      vert.translate(dq[0] - d[0], dq[1] - d[1], dq[2] - d[2]);
    }, this);
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

};


/**
 * Handles scale command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyScale = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
    return;
  }

  var mid = goog.vec.Vec3.createFloat32FromValues(
      data['mx'], data['my'], data['mz']);
  var d = goog.vec.Vec3.createFloat32();

  // Scale objects/ parts.
  if (data['objMode']) {
    goog.array.forEach(data['ids'], function(id) {
      var obj = this.scene_.objects[id];
      goog.vec.Vec3.subtract(obj.getPosition(), mid, d);

      obj.translate(
          d[0] * data['sx'] - d[0],
          d[1] * data['sy'] - d[1],
          d[2] * data['sz'] - d[2]
      );
      obj.scale(data['sx'], data['sy'], data['sz']);
    }, this);
  } else {
    goog.array.forEach(data['ids'], function(p) {
      var vert = this.scene_.objects[p[0]].verts[p[1]];
      goog.vec.Vec3.subtract(vert.getPosition(), mid, d);
      vert.translate(
          d[0] * data['sx'] - d[0],
          d[1] * data['sy'] - d[1],
          d[2] * data['sz'] - d[2]
      );
    }, this);
  }
};


/**
 * Executes delete command.
 *
 * @param {shapy.editor.Editable}
 */
shapy.editor.Executor.prototype.emitDelete = function(obj) {

};


/**
 * Handles delete command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyDelete = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
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


/**
 * Executes extrude command.
 *
 * @param {shapy.editor.Editable} obj   Object the group belongs to.
 * @param {shapy.editor.Editable} group Parts group to be extruded.
 */
shapy.editor.Executor.prototype.emitExtrude = function(obj, group) {

};


/**
 * Handles extrude command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyExtrude = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
    return;
  }

  // Get the object.
  var object = this.scene_.objects[data['objId']];

  // Extrude the faces.
  object.extrude(goog.array.map(data['faceIds'], function(faceId) {
    return object.faces[faceId];
  }, this));
};


/**
 * Executes connect command.
 *
 * @param {shapy.editor.Editable} obj   Object the group belongs to.
 * @param {shapy.editor.Editable} group Parts group to be extruded.
 */
shapy.editor.Executor.prototype.emitConnect = function(obj, group) {

};


/**
 * Handles connect command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyConnect = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
    return;
  }

  // Get the object.
  var object = this.scene_.objects[data['objId']];

  // Connect the vertices.
  object.connect(goog.array.map(data['vertIds'], function(vertId) {
    return object.verts[vertId];
  }, this));
};


/**
 * Executes merge command.
 *
 * @param {shapy.editor.Editable} obj   Object the group belongs to.
 * @param {shapy.editor.Editable} group Parts group to be extruded.
 */
shapy.editor.Executor.prototype.emitMerge = function(obj, group) {

};


/**
 * Handles merge command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyMerge = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
    return;
  }

  // Get the object.
  var object = this.scene_.objects[data['objId']];

  // Merge the vertices.
  object.mergeVertices(goog.array.map(data['vertIds'], function(vertId) {
    return object.verts[vertId];
  }, this));
};


/**
 * Executes paint command.
 *
 * @param {!shapy.browser.Texture} t Texture.
 * @param {number}                 u U coordinate.
 * @param {number}                 v V coordinate.
 * @param {{!goog.vec.Vec3.Type}}  bc Brush colour.
 * @param {number}                 br Brush radius.
 */
shapy.editor.Executor.prototype.emitPaint = function(t, u, v, bc, br) {

};


/**
 * Handles paint command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyPaint = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
    return;
  }

  // Get the texture.
  var texture = this.editor_.textures_[data['textureId']];

  // Paint the texture.
  texture.paint(
      data['u'],
      data['v'],
      goog.vec.Vec3.createFloat32FromValues(
          data['bcr'],
          data['bcg'],
          data['bcb']
      ),
      data['br']
  );
};


/**
 * Executes texture apply command.
 *
 * @param {number} id ID of the texture to apply.
 */
shapy.editor.Executor.prototype.emitTexture = function(id) {

};


/**
 * Handles texture apply command.
 *
 * @param {!Object} data
 */
shapy.editor.Executor.prototype.applyTexture = function(data) {
  // Ignore edits performed by the current user.
  if (this.editor_.user && data['userId'] == this.editor_.user.id) {
    return;
  }

  // Apply the texture.
  this.editor_.applyTexture(
      data['textureId'], 
      this.scene_.objects[data['objId']]
  );
};



/**
 * Applies and makes changes to the scene.
 *
 * @constructor
 * @extends {shapy.editor.Executor}
 *
 * @param {!shapy.editor.Scene}  scene
 * @param {!shapy.editor.Editor} editor
 */
shapy.editor.WriteExecutor = function(scene, editor) {
  shapy.editor.Executor.call(
      this, scene, editor, shapy.editor.Executor.Type.WRITE);
};
goog.inherits(shapy.editor.WriteExecutor, shapy.editor.Executor);


/**
 * Executes the create command.
 *
 * @param {string} type
 */
shapy.editor.WriteExecutor.prototype.emitCreate = function(type) {
  this.sendCommand({
    type: 'create',
    object: type
  });
};


/**
 * Executes the select command.
 *
 * @param {!Array<!shapy.editor.Object>} toLock
 * @param {!Array<!shapy.editor.Object>} toUnlock
 */
shapy.editor.WriteExecutor.prototype.emitSelect = function(toLock, toUnlock) {
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
 * Executes the translate command.
 *
 * @param {shapy.editor.Editable.Type} obj Object to be translated.
 * @param {number}                     dx  Delta on x.
 * @param {number}                     dy  Delta on y.
 * @param {number}                     dz  Delta on z.
 */
shapy.editor.WriteExecutor.prototype.emitTranslate = function(obj, dx, dy, dz) {
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
 * Executes the rotate command.
 *
 * @param {shapy.editor.Editable.Type} obj
 * @param {number}                     x
 * @param {number}                     y
 * @param {number}                     z
 * @param {number}                     w
 * @param {!goog.vec.Vec3.Type}        m
 */
shapy.editor.WriteExecutor.prototype.emitRotate = function(obj, x, y, z, w, m) {
  var data = {
    type: 'edit',
    tool: 'rotate',
    userId: this.editor_.user.id,

    mx: m[0],
    my: m[1],
    mz: m[2],

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
    // Parts group.
    data.ids = obj.getObjVertIds();
  }

  this.sendCommand(data);
};


/**
 * Executed the scale command.
 *
 * @param {shapy.editor.Editable.Type} obj
 * @param {number}                     sx
 * @param {number}                     sy
 * @param {number}                     sz
 * @param {!goog.vec.Vec3.Type}        m
 */
shapy.editor.WriteExecutor.prototype.emitScale = function(obj, sx, sy, sz, m) {
  var data = {
    type: 'edit',
    tool: 'scale',
    userId: this.editor_.user.id,

    mx: m[0],
    my: m[1],
    mz: m[2],

    sx: sx,
    sy: sy,
    sz: sz,

    objMode: this.editor_.mode.object
  };

  // Objects group.
  if (this.editor_.mode.object) {
    data.ids = obj.getObjIds();
  } else {
    // Parts group.
    data.ids = obj.getObjVertIds();
  }

  this.sendCommand(data);
};


/**
 * Executes delete command.
 *
 * @param {shapy.editor.Editable}
 */
shapy.editor.WriteExecutor.prototype.emitDelete = function(obj) {
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
 * Executes extrude command.
 *
 * @param {shapy.editor.Editable} obj   Object the group belonds to.
 * @param {shapy.editor.Editable} group Parts group to be extruded.
 */
shapy.editor.WriteExecutor.prototype.emitExtrude = function(obj, group) {
  this.sendCommand({
    type: 'edit',
    tool: 'extrude',
    userId: this.editor_.user.id,

    objId: obj.id,
    faceIds: group.getFaceIds()
  });
};


/**
 * Executes connect command.
 *
 * @param {shapy.editor.Editable} obj   Object the group belongs to.
 * @param {shapy.editor.Editable} group Parts group to be extruded.
 */
shapy.editor.WriteExecutor.prototype.emitConnect = function(obj, group) {
  this.sendCommand({
    type: 'edit',
    tool: 'connect',
    userId: this.editor_.user.id,

    objId: obj.id,
    vertIds: group.getVertIds()
  });
};


/**
 * Executes merge command.
 *
 * @param {shapy.editor.Editable} obj   Object the group belongs to.
 * @param {shapy.editor.Editable} group Parts group to be extruded.
 */
shapy.editor.WriteExecutor.prototype.emitMerge = function(obj, group) {
  this.sendCommand({
    type: 'edit',
    tool: 'merge',
    userId: this.editor_.user.id,

    objId: obj.id,
    vertIds: group.getVertIds()
  });
};


/**
 * Executes paint command.
 *
 * @param {!shapy.browser.Texture} t Texture.
 * @param {number}                 u U coordinate.
 * @param {number}                 v V coordinate.
 * @param {{!goog.vec.Vec3.Type}}  bc Brush colour.
 * @param {number}                 br Brush radius.
 */
shapy.editor.WriteExecutor.prototype.emitPaint = function(t, u, v, bc, br) {
  // TODO(ilija): Remove when texture is applied.
  return;

  this.sendCommand({
    type: 'edit',
    tool: 'paint',
    userId: this.editor_.user.id,

    textureId: t.id,
    u: u,
    v: v,

    bcr: bc[0],
    bcg: bc[1],
    bcb: bc[2],
    br: br
  });
};


/**
 * Executes texture apply command.
 *
 * @param {number}                 id ID of the texture to apply.
 * @param {shapy.editor.Editable} obj Object the texture is to be applied to.
 */
shapy.editor.Executor.prototype.emitTexture = function(id, obj) {
  this.sendCommand({
    type: 'edit',
    tool: 'texture',
    userId: this.editor_.user.id,

    textureId: id,
    objId: obj.id
  });
};



/**
 * Receives changes and upates the scene.
 *
 * @constructor
 * @extends {shapy.editor.Executor}
 *
 * @param {!shapy.editor.Scene}  scene
 * @param {!shapy.editor.Editor} editor
 */
shapy.editor.ReadExecutor = function(scene, editor) {
  shapy.editor.Executor.call(
      this, scene, editor, shapy.editor.Executor.Type.READ);
};
goog.inherits(shapy.editor.ReadExecutor, shapy.editor.Executor);



/**
 * List of executor types.
 * @enum {string}
 */
shapy.editor.Executor.Type = {
  WRITE: 'write',
  READ: 'read'
};
