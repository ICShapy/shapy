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
 * @param {!angular.$scope}      $rootScope The angular root scope.
 * @param {!angular.$scope}      $scope     The angular root scope.
 * @param {!angular.$q}          $q         The angular promise service.
 * @param {!shapy.Scene}         scene      Scene being edited.
 * @param {!shapy.UserService}   shUser User service which can cache user info.
 * @param {!shapy.editor.Editor} shEditor
 */
shapy.editor.ToolbarController = function(
    $rootScope,
    $scope,
    $q,
    scene,
    shUser,
    shEditor)
{
  $scope.floor = Math.floor;

  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;
  /** @private {!shapy.editor.Editor} @const */
  this.shEditor_ = shEditor;

  /** @public {!shapy.Scene} @const */
  this.scene = scene;
  /** @public {!Array<!shapy.User>} */
  this.users = [];
  /** @public {!shapy.editor.Mode} */
  this.mode = shEditor.mode;

  // Watch for changes in the user ID list & fetch user objects periodically.
  $scope.$watch(goog.bind(function() {
    return this.scene.users;
  }, this), goog.bind(function() {
    $q.all(goog.array.map(this.scene.users, goog.bind(shUser.get, shUser)))
        .then(goog.bind(function(users) {
          this.users = users;
        }, this));
  }, this), true);
};


/**
 * Toggle the chat UI
 */
shapy.editor.ToolbarController.prototype.toggleChatbox = function() {
  $('#chatbox').toggle();
}


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
 * Called when the rig has to be changed.
 *
 * @param {string} name Name of the new rig.
 */
shapy.editor.ToolbarController.prototype.rig = function(name) {
  this.shEditor_.setRig(name);
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

