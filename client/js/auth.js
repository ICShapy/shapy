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
  /** @private {boolean} */
  this.fetched_ = false;
  /** @private {shapy.AuthService.User} */
  this.user_ = null;
};


/**
 * Returns data of an authenticated user.
 */
shapy.AuthService.prototype.auth = function() {
  var defer = this.q_.defer();
  if (this.fetched_) {
    defer.resolve(this.user_);
    return defer.promise;
  }

  this.http_.get('/api/user/auth')
      .success(function(data) {
        this.user_ = new shapy.AuthService.User(this, data);
        this.fetched_ = true;
        defer.resolve(this.user_);
      }.bind(this))
      .error(function() {
        this.user_ = null;
        this.fetched_ = true;
        defer.resolve(this.user_);
      });
  return defer.promise;
};


/**
 * Logs a user in.
 *
 * @param {string} email
 * @param {string} passw
 *
 * @return {!angular.$q}
 */
shapy.AuthService.prototype.login = function(email, passw) {
  this.fetched_ = false;
  this.user_ = null;
  return this.http_.post('/api/user/login', {
      email: email,
      passw: passw
  });
};


/**
 * Logs a user out.
 */
shapy.AuthService.prototype.logout = function() {
  this.fetched_ = false;
  this.user_ = null;
  return this.http_.post('/api/user/logout');
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
  /** @private {string} */
  this.name = data['first_name'] + ' ' + data['last_name']
};
