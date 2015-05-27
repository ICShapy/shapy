// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Editor');

goog.require('goog.dom');
goog.require('goog.math.Size');
goog.require('goog.object');
goog.require('goog.string.format');
goog.require('goog.webgl');
goog.require('shapy.editor.Camera');
goog.require('shapy.editor.Editable');
goog.require('shapy.editor.Layout');
goog.require('shapy.editor.Layout.Double');
goog.require('shapy.editor.Layout.Quad');
goog.require('shapy.editor.Layout.Single');
goog.require('shapy.editor.Renderer');
goog.require('shapy.editor.Viewport');



/**
 * Class handling the editor interface.
 *
 * @constructor
 * @ngInject
 *
 * @param {!shapy.auth.User} user User information.
 * @param {!shapy.Scene} scene Current scene.
 * @param {!angular.$rootScope} $rootScope Angular rootScope.
 * @param {!angular.$scope} $scope Angular scope.
 * @param {!angular.$location} $location Angular location service.
 */
shapy.editor.Editor = function(
    user,
    scene,
    $rootScope,
    $scope,
    $location)
{
  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;
  /** @private {!angular.$scope} @const */
  this.scope_ = $scope;

  /**
   * Current scene.
   * @public {!shapy.Scene}
   */
  this.scene = scene;

  /**
   * WebSocket connection.
   * @private {WebSocket} @const
   */
  this.sock_ = new WebSocket(goog.string.format(
      'ws://%s:%s/api/edit/%s', $location.host(), $location.port(), scene.id));

  // Set up some event handlers.
  this.sock_.onmessage = goog.bind(this.onMessage_, this);
  this.sock_.onclose = goog.bind(this.onClose_, this);
  this.scope_.$on('$destroy', goog.bind(this.onDestroy_, this));
  this.rootScope_.$on('editor', goog.bind(this.onEditorMessage_, this));
};


/**
 * Called on the receipt of a message from the server.
 *
 * @private
 *
 * @param {MessageEvent} evt
 */
shapy.editor.Editor.prototype.onMessage_ = function(evt) {
  var data;

  // Try to make sense of the data.
  try {
    data = JSON.parse(evt.data);
  } catch (e) {
    console.error('Invalid message: ' + evt.data);
  }

  this.rootScope_.$apply(goog.bind(function() {
    switch (data['type']) {
      case 'join': {
        this.scene.addUser(data['user']);
        break;
      }
      case 'meta': {
        this.scene.setName(data['name']);
        this.scene.setUsers(data['users']);
        break;
      }
      case 'leave': {
        this.scene.removeUser(data['user']);
        break;
      }
      case 'edit': {
        switch (data['tool']) {
          case 'translate': {
            this.scene.objects[data['id']].translate(
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


/**
 * Called when an object in the scene is being edited.
 *
 * @private
 *
 * @param {string} n    Name of the message.
 * @param {Object} data Editor message.
 */
shapy.editor.Editor.prototype.onEditorMessage_ = function(n, data) {
  this.sock_.send(JSON.stringify(data));
};

/**
 * Called when the server suspends the connection.
 *
 * @private
 *
 * @param {CloseEvent} evt
 */
shapy.editor.Editor.prototype.onClose_ = function(evt) {
};


/**
 * Called when everything should be closed.
 *
 * @private
 */
shapy.editor.Editor.prototype.onDestroy_ = function() {
  this.sock_.close();
};


