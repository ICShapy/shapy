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
 * @param {!angular.$http}           $http The angular http service.
 * @param {!angular.$q}              $q    The angular promise service.
 */
shapy.browser.Service = function($http, $q) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.$q} @const */
  this.q_ = $q;

  /*
   * Cached scenes.
   * @private {!Object<string, shapy.browser.Asset.Scene>} @const
   */
  this.scenes_ = {};

  /**
   * Cached directories.
   * @private {!Object<string, shapy.browser.Asset.Dir>} @const
   */
  this.dirs_ = {};

  /**
   * Private home dir.
   *
   * @public {shapy.browser.Asset.Dir}
   * @const
   */
  this.home = null;

  /**
   * Current directory.
   * @public {shapy.browser.Asset.Dir}
   */
  this.current = null;

  /**
   * Public home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  //this.homePublic = new shapy.browser.Asset.Dir(-1, 'homePublic', null);

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
};


/**
 * Creates a new asset.
 *
 * @private
 *
 * @param {string}   url  URL of the resource.
 * @param {Function} cons Asset constructor.
 *
 * @return {!shapy.browser.Asset}
 */
shapy.browser.Service.prototype.create_ = function(url, cons) {
  var parent = this.current;
  return this.http_.post(url, { parent: parent.id })
      .then(goog.bind(function(response) {
        var dir = new cons(this, response.data.id, response.data);
        this.dirs_[dir.id] = dir;
        parent.children.push(dir);
        dir.parent = parent;
      }, this));
};


/**
 * Injects new dir into databse and returns a promise with response.
 *
 * @return {!shapy.browser.Asset.Dir}
 */
shapy.browser.Service.prototype.createDir = function() {
  return this.create_('/api/assets/dir', shapy.browser.Asset.Dir);
};


/**
 * Creates a new scene.
 *
 * @return {!angular.$q} Promise to return a new scene.
 */
shapy.browser.Service.prototype.createScene = function() {
  return this.create_('/api/assets/scene', shapy.browser.Asset.Scene);
};


/**
 * Creates a new texture.
 *
 * @return {!angular.$q} Promise to return a new texture.
 */
shapy.browser.Service.prototype.createTexture = function() {
  return this.create_('/api/assets/texture', shapy.browser.Asset.Texture);
};




/**
 * Creates a new asset.
 *
 * @private
 *
 * @param {string}                  url   URL of the resource.
 * @param {!Object<string, Object>} cache Cache for the resource.
 * @param {Function}                cons  Asset constructor.
 * @param {string}                  id    ID of the resource.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.get_ = function(url, cache, cons, id) {
  if (!goog.isDef(id)) {
    return this.q_.reject({ error: 'Invalid ID.' });
  }

  var asset;
  if (goog.object.containsKey(cache, id)) {
    asset = cache[id];
    if (asset.ready) {
      return asset.ready.promise;
    }
  } else {
    asset = new cons(this, id);
    cache[id] = asset;
  }

  asset.ready = this.q_.defer();
  this.http_.get(url, {params: { id: id }})
    .then(goog.bind(function(response) {
      asset.load(response.data);
      asset.ready.resolve(asset);
    }, this), function() {
      asset.ready.reject();
    });

  return asset.ready.promise;
};


/**
 * Sends request to server to query database for contents of given dir.
 *
 * @param {number} dirID ID of the directory.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.getDir = function(dirID) {
  return this.get_(
      '/api/assets/dir',
      this.dirs_,
      shapy.browser.Asset.Dir,
      dirID
  );
};


/**
 * Fetches a scene from the server or from local storage.
 *
 * @param {number} sceneID ID of the scene.
 *
 * @return {!angular.$q} Promise to return the scene.
 */
shapy.browser.Service.prototype.getScene = function(sceneID) {
  return this.get_(
      '/api/assets/scene',
      this.scenes_,
      shapy.browser.Asset.Scene,
      sceneID
  );
};


/**
 * Fetches a scene from the server or from local storage.
 *
 * @param {number} textureID ID of the scene.
 *
 * @return {!angular.$q} Promise to return the scene.
 */
shapy.browser.Service.prototype.getTexture = function(textureID) {
  return this.get_(
      '/api/assets/textures',
      this.textures_,
      shapy.browser.Asset.Texture,
      textureID
  );
};

