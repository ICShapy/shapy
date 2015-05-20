// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.Scene');
goog.provide('shapy.SceneService');



/**
 * Class encapsulating all information about a scene.
 *
 * @constructor
 *
 * @param {string} id ID of the scene.
 * @param {Object} data Data from the server.
 */
shapy.Scene = function(id, data) {
  /**
   * ID of the scene.
   * @public {string} @const
   */
  this.id = id;

  /**
   * Name of the scene.
   * @public {string}
   */
  this.name = data['name'] || 'Untitled';

  /**
   * List of users editing the scene.
   * @public {Array<string>}
   */
  this.users = data['users'] || [];
};



/**
 * Retrieves a scene object from cache or server.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http} $http The Angular HTTP service.
 * @param {!angular.$q}    $q    The Angular promise service.
 */
shapy.SceneService = function($http, $q) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.$q} @const */
  this.q_ = $q;
  /** @private {!Object<string, shapy.Scene>} @const */
  this.scenes_ = {};
};


/**
 * Fetches a scene from the server or from local storage.
 *
 * @param {string} sceneID ID of the scene.
 *
 * @return {!angular.$q} Scene wrapped in a promise.
 */
shapy.SceneService.prototype.get = function(sceneID) {
  if (!sceneID) {
    throw new Error('Invalid scene ID');
  }

  var defer = this.q_.defer();

  if (goog.object.containsKey(this.scenes_, sceneID)) {
    defer.resolve(this.scenes_[sceneID]);
    return defer.promise;
  }

  this.http_.get('/api/scene/' + sceneID).success(goog.bind(function(data) {
    this.scenes_[sceneID] = new shapy.Scene(sceneID, data);
    defer.resolve(this.scenes_[sceneID]);
  }, this));

  return defer.promise;
};
