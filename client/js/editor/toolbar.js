// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.ToolbarController');



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
  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;
  /** @private {!shapy.editor.Editor} @const */
  this.shEditor_ = shEditor;

  /** @public {!shapy.Scene} @const */
  this.scene = scene;
  /** @public {!Array<!shapy.User>} */
  this.users = [];

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
 * Called when the layout has to be changed.
 *
 * @param {string} name Name of the new layout.
 */
shapy.editor.ToolbarController.prototype.layout = function(name) {
  this.shEditor_.setLayout(name);
};


/**
 * Called when new object has to be added.
 *
 * @param {string} name Name of the object.
 */
shapy.editor.ToolbarController.prototype.addObject = function(name) {
  this.shEditor_.create(name);
};
