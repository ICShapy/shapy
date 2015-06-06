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
 * @param {!angular.$state}        $state    Angular state object.
 * @param {!shapy.UserService}     shUser    Authentication service.
 * @param {!shapy.browser.Service} shBrowser The browser service.
 * @param {!shapy.User}            user      User object.
 */
shapy.HeaderController = function($state, shUser, shBrowser, user) {
  /** @export */
  this.user = user;
  /** @private {!shapy.AuthService} @const */
  this.shUser_ = shUser;
  /** @private {!shapy.browser.Service} @const */
  this.shBrowser_ = shBrowser;
  /** @private {!angular.$state} @const */
  this.state_ = $state;
};


/**
 * Logout action.
 *
 * @export
 */
shapy.HeaderController.prototype.logout = function() {
  this.shBrowser_.clearAllCache();
  this.shUser_.logout().then(goog.bind(function() {
    this.state_.go('main', null, { reload: true });
  }, this));
};
