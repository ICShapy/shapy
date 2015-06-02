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
      case 'leave': {
        this.scene_.removeUser(data['user']);
        break;
      }
      case 'create': {
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
            break;
          }
        }
        break;
      }
      case 'edit': {
        switch (data['tool']) {
          case 'translate': {
            this.scene_.objects[data['id']].translate(
                data['x'], data['y'], data['z']);
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