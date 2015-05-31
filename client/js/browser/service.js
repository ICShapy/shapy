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
 * Injects new dir into databse and returns a promise with response.
 *
 * @return {!shapy.browser.Asset.Dir}
 */
shapy.browser.Service.prototype.createDir = function() {
  var parent = this.current;
  return this.http_.post('/api/assets/dir', { parent: parent.id })
      .then(goog.bind(function(response) {
        var dir = new shapy.browser.Asset.Dir(
            this, response.data.id, response.data);
        this.dirs_[dir.id] = dir;
        parent.children.push(dir);
        dir.parent = parent;
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
 *
 * @param {number} dirID ID of the directory.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.getDir = function(dirID) {
  if (!goog.isDef(dirID)) {
    return this.q_.reject({ error: 'Invalid directory ID.' });
  }

  var dir;
  if (goog.object.containsKey(this.dirs_, dirID)) {
    dir = this.dirs_[dirID];
    if (dir.ready) {
      return dir.ready.promise;
    }
  } else {
    dir = new shapy.browser.Asset.Dir(this, dirID);
    this.dirs_[dirID] = dir;
  }

  dir.ready = this.q_.defer();
  this.http_.get('/api/assets/dir', {params: { id: dirID }})
    .then(goog.bind(function(response) {
      dir.load(response.data);
      dir.ready.resolve(dir);
    }, this));

  return dir.ready.promise;
};



/**
 * Fetches a scene from the server or from local storage.
 *
 * @param {number} sceneID ID of the scene.
 *
 * @return {!angular.$q} Promise to return the scene.
 */
shapy.browser.Service.prototype.getScene = function(sceneID) {
  if (!goog.isDef(sceneID)) {
    return this.q_.reject({ error: 'Invalid scene ID.' });
  }
  var scene;
  if (goog.object.containsKey(this.scenes_, sceneID)) {
    scene = this.scenes_[sceneID];
    if (scene.ready) {
      return scene.ready.promise;
    }
  } else {
    scene = new shapy.browser.Asset.Scene(this, sceneID);
    this.scenes_[sceneID] = scene;
  }

  scene.ready = this.q_.defer();
  this.http_.get('/api/assets/scene', {params: { id: sceneID }})
    .then(goog.bind(function(response) {
      scene.load(response.data);
      scene.ready.resolve(scene);
    }, this));

  return scene.ready.promise;
};
