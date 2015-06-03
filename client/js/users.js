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
 */
shapy.User = function(data) {
  /** @public {number} @const */
  this.id = data['id'];
  /** @public {string} @const */
  this.name = data['first_name'] + ' ' + data['last_name'];
  /** @public {string} @const */
  this.email = data['email'];
  /** @public {!goog.vec.Vec3} @const */
  this.colour = goog.vec.Vec3.createFloat32FromValues(0.7, 0.7, 0.7);
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
        var user = new shapy.User(response.data);
        user.colour = shapy.User.Colour[this.count_ % shapy.User.Colour.length];
        this.count_++;
        this.users_[userID] = user;
        return user;
      }, this));
};
