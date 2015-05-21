// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.LoginController');



/**
 * Login controller.
 *
 * @constructor
 * @ngInject
 * @private
 */
shapy.LoginController = function($state, shAuth) {
  /** @public {string} */
  this.passw = '';
  /** @public {string} */
  this.email = '';
  /** @private {!shapy.AuthService} @const */
  this.shAuth_ = shAuth;
  /** @private {!angular.$state} @const */
  this.state_ = $state;
};


/**
 * Login action.
 */
shapy.LoginController.prototype.login = function() {
  this.shAuth_.login(this.email, this.passw).then(goog.bind(function() {
    this.state_.go('main', null, { reload: true });
  }, this));
};