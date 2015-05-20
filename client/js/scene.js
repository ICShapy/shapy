// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.Scene');
goog.provide('shapy.SceneService');



/**
 * Class encapsulating all information about a scene.
 *
 * @constructor
 */
shapy.Scene = function() {
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
};


/**
 * Fetches a scene from the server or from local storage.
 *
 * @return {!angular.$q} Scene wrapped in a promise.
 */
shapy.SceneService.prototype.get = function(sceneID) {
  return 'a';
};
