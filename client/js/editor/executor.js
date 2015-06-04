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
  this.mode.setObject();
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
 * @param {shapy.editor.Object.Type} obj Object to be translated.
 * @param {number}                   x Absolute position on x.
 * @param {number}                   y Absolute position on y.
 * @param {number}                   z Absolute position on z.
 */
shapy.editor.Executor.prototype.emitTranslate = function(obj, x, y, z) {

  var data = {
    type: 'edit',
    tool: 'translate',
    x: x,
    y: y,
    z: z,
    userId: this.editor_.user.id,
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
  // Ignore the edit if it is performed by current user.
  if (data['userId'] == this.editor_.user.id) {
    return;
  }

  if (data['objMode']) {
    goog.array.forEach(data['ids'], function(id) {
      this.scene_.objects[id].setPosition(data['x'], data['y'], data['z']);
    }, this);
  }
};
