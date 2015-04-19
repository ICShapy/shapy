// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.AuthService');
goog.provide('shapy.AuthService.User');



/**
 * Service that handles authentication.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$q}    $q    The angular promise service.
 * @param {!angular.$http} $http The angular http service.
 */
shapy.AuthService = function($q, $http) {
  /** @private {!angular.$q} @const */
  this.q_ = $q;
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {shapy.AuthService.User} */
  this.user_ = null;
};


/**
 * Logs the user in.
 */
shapy.AuthService.prototype.login = function() {
  if (this.user) {
    var defer = this.q_.defer();
    defer.resolve(this.user_);
    return defer.promise;
  }

  return this.http_.get('/api/user/auth').success(function(data) {
    this.user = shapy.AuthService.User(this, data);
    return this.user;
  }.bind(this));
};



/**
 * Wraps user data & provides methods to manipulate it.
 *
 * @constructor
 *
 * @param {shapy.AuthService} auth Authenticator service.
 * @param {Object}            data Server-side data.
 */
shapy.AuthService.User = function(shAuth, data) {
  /** @private {!shapy.AuthService} @const */
  this.shAuth_ = shAuth;
};


