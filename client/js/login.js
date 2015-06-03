// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.LoginController');



/**
 * Login controller.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$state} $state Angular state.
 * @param {!shapy.AuthService} shUser Authentication service.
 */
shapy.LoginController = function($state, shUser) {
  /** @public {string} */
  this.password = '';
  /** @public {string} */
  this.username = '';
  /** @private {!shapy.AuthService} @const */
  this.shUser_ = shUser;
  /** @private {!angular.$state} @const */
  this.state_ = $state;
};


/**
 * Login action.
 */
shapy.LoginController.prototype.login = function() {
  this.shUser_.login(this.username, this.password).then(goog.bind(function() {
    this.state_.go('main', null, { reload: true });
  }, this));
};
