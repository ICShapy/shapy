// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.BrowserService');

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
shapy.browser.BrowserService = function($http, $q) {
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
  this.home = new shapy.browser.Asset.Dir(this, 0, 'home', null);

  /**
   * Public home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  this.homePublic = new shapy.browser.Asset.Dir(this, -1, 'homePublic', null);

  /**
   * Path to current folder
   * @public {Array.<shapy.browser.Asset.Dir>}
   * @export
   */
  this.path = [];
};


/**
 * Renames an asset.
 *
 * @param {shapy.browser.Asset} asset Asset to be renamed.
 * @param {string}              name  New name of the asset.
 *
 * @return {!angular.$q}
 */
shapy.browser.BrowserService.prototype.rename = function(asset, name) {
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
 * @param {boolean} public   Flag showing whether dir is publicly accessible.
 * @param {!shapy.browser.Asset.Dir} parent Parent directory.
 *
 * @return {!shapy.browser.Asset.Dir}
 */
shapy.browser.BrowserService.prototype.createDir = function(
    public,
    parent)
{
  // TODO: read the public flag on the backend, don't trust the
  // frontend to pass a correct one!
  return this.http_.post('/api/assets/dir/create', {
    public: public,
    parent: parent.id
  })
  .then(goog.bind(function(response) {
    return new shapy.browser.Asset.Dir(
        this,
        response.data['id'],
        response.data['name'],
        parent
    );
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
shapy.browser.BrowserService.prototype.queryDir = function(dir, public) {
  var publicSpace = (public) ? 1 : 0;
  return this.http_.get('/api/assets/dir/' + dir.id + '/' + publicSpace)
      .then(goog.bind(function(response) {
        var assets = [];

        // Iterate over responses, convert into assets.
        goog.array.forEach(response.data, function(item) {
          switch (item['type']) {
            case 'dir':
              assets.push(new shapy.browser.Asset.Dir(
                  this, item['id'], item['name'], dir));
              break;
            case 'scene':
              assets.push(new shapy.browser.Asset.Scene(
                  this, item['id'], item['name']), item['preview'], dir);
              break;
            case 'texture':
              assets.push(new shapy.browser.Asset.Texture(
                  this, item['id'], item['name']), item['preview'], dir);
              break;
            default:
              console.log('Wrong type in database!');
              break;
          }
        }, this);

        // Note that loading done.
        dir.loaded = true;

        return assets;
      }, this));
};
