// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.ToolbarController');



/**
 * Controller for the editor toolbar.
 *
 * @constructor
 *
 * @param {!angular.$scope}    $rootScope The angular root scope.
 * @param {!angular.$scope}    $scope     The angular root scope.
 * @param {!angular.$q}        $q         The angular promise service.
 * @param {!shapy.Scene}       scene      Scene being edited.
 * @param {!shapy.UserService} shUser User service which can cache user info.
 */
shapy.editor.Toolbar = function(
    $rootScope,
    $scope,
    $q,
    scene,
    shUser)
{
  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;

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
shapy.editor.Toolbar.prototype.layout = function(name) {
  this.rootScope_.$emit('editor', {
    type: 'layout',
    layout: name
  });
};


/**
 * Called when new object has to be added.
 *
 * @param {string} name Name of the object.
 */
shapy.editor.Toolbar.prototype.addObject = function(name) {
  this.rootScope_.$emit('editor', {
    type: 'create',
    object: name
  });
};
