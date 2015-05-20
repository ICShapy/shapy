// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.HeaderController');



/**
 * Controller for the header.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$state}         $state Angular state object.
 * @param {!shapy.AuthService}      shAuth Authentication service.
 * @param {!shapy.AuthService.User} user   User object.
 */
shapy.HeaderController = function($state, shAuth, user) {
  /** @export */
  this.user = user;
  /** @private {!shapy.AuthService} @const */
  this.shAuth_ = shAuth;
  /** @private {!angular.$state} @const */
  this.state_ = $state;
};


/**
 * Logout action.
 *
 * @export
 */
shapy.HeaderController.prototype.logout = function() {
  this.shAuth_.logout().then(goog.bind(function() {
    this.state_.go('main', null, { reload: true });
  }, this));
};