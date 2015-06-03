// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.User');
goog.provide('shapy.UserService');

goog.require('goog.object');



/**
 * Lightweight user information.
 *
 * @constructor
 * @ngInject
 *
 * @param {Object} data Data from the server.
 * @param {number} count Index number of the user.
 */
shapy.User = function(data, count) {
  /** @public {number} @const */
  this.id = data['id'];
  /** @public {string} @const */
  this.name = data['first_name'] + ' ' + data['last_name'];
  /** @public {string} @const */
  this.email = data['email'];
  /** @public {!goog.vec.Vec3} @const */
  this.colour = shapy.User.Colour[count % shapy.User.Colour.length];
};


/**
 * Colours assigned to users.
 *
 * @type {!Array<goog.vec.Vec3>} @const
 */
shapy.User.Colour = [
  [0.40, 0.60, 1.00],
  [1.00, 0.00, 0.00],
  [0.00, 1.00, 0.00],
  [0.00, 0.00, 1.00],
  [1.00, 1.00, 0.00],
  [1.00, 0.00, 1.00],
  [0.00, 1.00, 1.00]
];



/**
 * Service that caches lightweight user information.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http} $http The angular http service.
 * @param {!angular.$q}    $q    The angular promise service.
 */
shapy.UserService = function($http, $q) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.$q} @const */
  this.q_ = $q;
  /** @private {number} @const */
  this.count_ = 0;
  /** @private {!Object<number, shapy.User>} @const */
  this.users_ = {};
  /** @private {boolean} */
  this.fetched_ = false;
  /** @private {shapy.User} */
  this.user_ = null;
};


/**
 * Places information about a user in the cache.
 *
 * @param {number} userID ID of the user.
 *
 * @return {!angular.$q} Promise to fetch the user.
 */
shapy.UserService.prototype.get = function(userID) {
  if (goog.object.containsKey(this.users_, userID)) {
    return this.q_.when(this.users_[userID]);
  }

  return this.http_.get('/api/user/' + userID)
      .then(goog.bind(function(response) {
        var user = new shapy.User(response.data, this.count_);
        this.count_++;
        this.users_[userID] = user;
        return user;
      }, this));
};


/**
 * Returns data of an authenticated user.
 *
 * @return {!angular.$q} Promise wrapping the user.
 */
shapy.UserService.prototype.auth = function() {
  var defer = this.q_.defer();
  if (this.fetched_) {
    defer.resolve(this.user_);
    return defer.promise;
  }

  this.http_.get('/api/user/auth')
      .success(function(data) {
        if (data['id']) {
          this.user_ = new shapy.User(data, this.count_);
          this.count_++;
          this.fetched_ = true;
        } else {
          this.user_ = null;
          this.fetched_ = true;
        }
        defer.resolve(this.user_);
      }.bind(this));
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
shapy.UserService.prototype.login = function(email, passw) {
  this.fetched_ = false;
  this.user_ = null;
  return this.http_.post('/api/user/login', {
      email: email,
      passw: passw
  });
};


/**
 * Logs a user out.
 *
 * @return {!angular.$q} Promise resolved when request succeeds.
 */
shapy.UserService.prototype.logout = function() {
  if (this.fetched_) {
    this.fetched_ = false;
    if (this.user_) {
      this.user_ = null;
      return this.http_.post('/api/user/logout');
    }
  }
  return this.q_.when();
};
