// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.ToolbarController');
goog.provide('shapy.editor.colourPicker');
goog.provide('shapy.editor.slider');

goog.require('goog.ui.HsvPalette');
goog.require('goog.ui.Slider');



/**
 * Controller for the editor toolbar.
 *
 * @constructor
 *
 * @param {!angular.$scope}       $rootScope The angular root scope.
 * @param {!angular.$scope}       $scope     The angular root scope.
 * @param {!angular.$q}           $q         The angular promise service.
 * @param {!shapy.Scene}          scene      Scene being edited.
 * @param {!shapy.UserService}    shUser User service which can cache user info.
 * @param {!shapy.editor.Editor}  shEditor
 * @param {!shapy.editor.Browser} shBrowser
 */
shapy.editor.ToolbarController = function(
    $rootScope,
    $scope,
    $q,
    scene,
    shUser,
    shEditor,
    shBrowser)
{
  $scope.floor = Math.floor;
  $scope.close = function() { shapy.toggleDropdown(false); };

  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;
  /** @private {!shapy.editor.Editor} @const */
  this.shEditor_ = shEditor;
  /** @private {!shapy.editor.Browser} @const */
  this.shBrowser_ = shBrowser;

  /** @public {!shapy.Scene} @const */
  this.scene = scene;
  /** @public {!Array<!shapy.User>} */
  this.users = [];
  /** @public {!shapy.editor.Mode} */
  this.mode = shEditor.mode;

  /** @public {string} */
  this.textureName = '';
  /** @public {!Array<!shapy.browser.Texture>} @const */
  this.textures = [];

  // Watch for changes in the user ID list & fetch user objects periodically.
  $scope.$watch(goog.bind(function() {
    return this.scene.users;
  }, this), goog.bind(function() {
    $q.all(goog.array.map(this.scene.users, goog.bind(shUser.get, shUser)))
        .then(goog.bind(function(users) {
          this.users = users;
        }, this));
  }, this), true);

  // Watch for chnages in the texture name.
  $scope.$watch(goog.bind(function() {
    return this.textureName;
  }, this), goog.bind(function() {
    shBrowser.filterTextures(this.textureName).then(goog.bind(function(data) {
      this.textures = data;
    }, this));
  }, this));
};


/**
 * Gets the number of unread messages
 *
 * @return {number}
 */
shapy.editor.ToolbarController.prototype.getUnreadMessages = function() {
  return this.shEditor_.unreadMessages;
};


/**
 * Toggle the chat UI
 */
shapy.editor.ToolbarController.prototype.toggleChatbox = function() {
  $('#chatbox').toggle();
  if ($('#chatbox').is(':visible')) {
    this.shEditor_.unreadMessages = 0;
  }
};


/**
 * Called when the layout has to be changed.
 *
 * @param {string} name Name of the new layout.
 */
shapy.editor.ToolbarController.prototype.layout = function(name) {
  this.shEditor_.setLayout(name);
};


/**
 * Switched to the UV layout.
 */
shapy.editor.ToolbarController.prototype.toggleUV = function() {
  this.shEditor_.toggleUV();
};


/**
 * Returns true if in UV viewport
 */
shapy.editor.ToolbarController.prototype.isUV = function() {
  return this.shEditor_.layout.active.type == shapy.editor.Viewport.Type.UV;
}


/**
 * Called when the rig has to be changed.
 *
 * @param {string} name Name of the new rig.
 */
shapy.editor.ToolbarController.prototype.rig = function(name) {
  this.shEditor_.setRig(name);
};


/**
 * Called when delete is pressed
 */
shapy.editor.ToolbarController.prototype.doDelete = function() {
  this.shEditor_.doDelete();
};


/**
 * Called when extrude is pressed
 */
shapy.editor.ToolbarController.prototype.doExtrude = function() {
  this.shEditor_.doExtrude();
};


/**
 * Called when merge is pressed
 */
shapy.editor.ToolbarController.prototype.doMerge = function() {
  this.shEditor_.doMerge();
};


/**
 * Called when connect is pressed
 */
shapy.editor.ToolbarController.prototype.doConnect = function() {
  this.shEditor_.doConnect();
};


/**
 * Called when weld is pressed
 */
shapy.editor.ToolbarController.prototype.doWeld = function() {
  this.shEditor_.doWeld();
};


/**
 * Called when new object has to be added.
 *
 * @param {string} name Name of the object.
 */
shapy.editor.ToolbarController.prototype.addObject = function(name) {
  this.shEditor_.create(name);
};


/**
 * Applies a texture to the currently selected objects.
 *
 * @param {number} id ID of the texture to apply.
 */
shapy.editor.ToolbarController.prototype.applyTexture = function(id) {
  var object;

  if (this.shEditor_.objectGroup.editables.length != 1) {
    return;
  }

  object = this.shEditor_.objectGroup.editables[0];

  // Send message to the server.
  this.shEditor_.exec_.emitTexture(id, object);
  // Apply the texture.
  this.shEditor_.applyTexture(id, object);
};



/**
 * Color picker directive.
 *
 * @param {!shapy.editor.Editor} shEditor Editor.
 *
 * @return {!angular.Directive}
 */
shapy.editor.colourPicker = function(shEditor) {
  return {
    restrict: 'E',
    link: function($scope, $elem, $attrs) {
      var picker = new goog.ui.HsvPalette(null, null, 'goog-hsv-palette-sm');
      goog.events.listen(picker, 'action', function(evt) {
        var colour = picker.getColor();
        shEditor.setBrushColour(
            parseInt(colour[1] + colour[2], 16),
            parseInt(colour[3] + colour[4], 16),
            parseInt(colour[5] + colour[6], 16)
        );
      });
      picker.render($elem[0]);
      picker.setColor('#00ff00');
    }
  };
};


/**
 * Slider directive.
 *
 * @param {!shapy.editor.Editor} shEditor Editor.
 *
 * @return {!angular.Directive}
 */
shapy.editor.slider = function(shEditor) {
  return {
    restrict: 'E',
    link: function($scope, $elem, $attrs) {
      var slider = new goog.ui.Slider();
      goog.events.listen(slider, 'change', function() {
        shEditor.setBrushRadius(slider.getValue());
      });
      slider.setMoveToPointEnabled(true);
      slider.render($elem[0]);
      slider.setValue(8);
    }
  };
};

