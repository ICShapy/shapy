// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.Service');

goog.require('shapy.browser.Asset');
goog.require('shapy.browser.Asset.Dir');
goog.require('shapy.browser.Asset.Scene');
goog.require('shapy.browser.Asset.Texture');



/**
 * Service that handles asset browsing.
 *
 * // TODO: rename this shapy.browser.Service, a bit shorter and nicer.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http} $http The angular http service.
 * @param {!angular.$q}    $q    The angular promise service.
 */
shapy.browser.Service = function($http, $q) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.$q} @const */
  this.q_ = $q;

  /**
   * Private home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  this.home = new shapy.browser.Asset.Dir(0, 'home', null);

  /**
   * Public home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  this.homePublic = new shapy.browser.Asset.Dir(-1, 'homePublic', null);

  /**
   * Current directory.
   * @type {shapy.browser.Asset.Dir}
   * @public
   * @export
   */
  this.currentDir = null;

  /**
   * Path to current folder
   * @public {Array.<shapy.browser.Asset.Dir>}
   * @export
   */
  this.path = [];

  /**
   * Query from user filtering assets.
   * @public {string}
   * @export
   */
  this.query = '';

  /*
   * Cached scenes.
   * @private {!Object<string, shapy.Scene>} @const
   */
  this.scenes_ = {};
};


/**
 * Renames an asset.
 *
 * @param {shapy.browser.Asset} asset Asset to be renamed.
 * @param {string}              name  New name of the asset.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.rename = function(asset, name) {
  return this.http_.post('/api/assets/rename', {
      id: asset.id,
      name: name
  }).then(goog.bind(function() {
    asset.name = name;
  }, this));
};


/**
 * Injects new dir into databse and returns a promise with response.
 *
 * @return {!shapy.browser.Asset.Dir}
 */
shapy.browser.Service.prototype.createDir = function() {
  return this.http_.post('/api/assets/dir', { parent: this.currentDir.id })
      .then(goog.bind(function(response) {
        return new shapy.browser.Asset.Dir(
            this,
            response.data['id'],
            response.data['name'],
            this.currentDir.id
        );
      }, this));
};


/**
 * Creates a new scene.
 *
 * @return {!angular.$q} Promise to return a new scene.
 */
shapy.browser.Service.prototype.createScene = function() {
  return this.http_.post('/api/assets/scene', { parent: this.currentDir.id })
      .then(goog.bind(function(response) {
        console.log('x');
      }, this));
};


/**
 * Sends request to server to query database for contents of given dir.
 * Returns array of assets.
 *
 * @param {!shapy.browser.Asset.Dir} dir Directory that we want to be queried.
 * @param {boolean} public Type of directory to query.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.queryDir = function(dir) {
  return this.http_.get('/api/assets/dir', {params: { id: dir.id }})
    .then(goog.bind(function(response) {
      console.log(response);
      dir.loaded = true;
      return goog.array.filter(goog.array.map(response['data'], function(item) {
        switch (item['type']) {
          case 'dir': {
            return new new shapy.browser.Asset.Dir(
                this, item['id'], item['name'], dir
            );
          }
          case 'scene': {
            return new shapy.browser.Asset.Scene(
                this, item['id'], item['name'], dir
            );
          }
          case 'texture': {
            return new shapy.browser.Asset.Texture(
                this, item['id'], item['name'], dir
            );
          }
        }

        console.error('Invalid asset type: "' + item['type'] + '"');
        return null;
      }, this), goog.isDefAndNotNull);
    }, this));
};



/**
 * Fetches a scene from the server or from local storage.
 *
 * @param {string} sceneID ID of the scene.
 *
 * @return {!angular.$q} Promise to return the scene.
 */
shapy.browser.Service.prototype.getScene = function(sceneID) {
  var defer = this.q_.defer();

  if (!sceneID) {
    defer.reject({ error: 'Invalid scene ID.' });
    return defer.promise;
  }

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
