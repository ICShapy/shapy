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
   * Home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
   this.home = new shapy.browser.Asset.Dir(0, 'home', null);


  /**
   * Path to current folder
   * @public {Array.<shapy.browser.Asset.Dir>}
   * @export
   */
  this.path = [];
};

/**
 * Injects new dir into databse and returns a promise with response.
 *
 * @param {string} name      Name of the directory.
 * @param {boolean} public   Flag showing whether dir is publicly accessible.
 * @param {!shapy.browser.Asset.Dir} parent Parent directory.
 */
shapy.browser.BrowserService.prototype.createDir = function(name, public, parent) {
  var def = this.q_.defer();

  // TODO: check if name unique in this dir

  // Inject into database, obtain id
  this.http_.post('/api/assets/create', {
    name: name,
    type: 'dir',
    public: public,
    parent: parent.id
  })
  .success(function(response) {
    def.resolve(new shapy.browser.Asset.Dir(response['id'], name, parent));
  })
  .error(function() {
    def.reject();
  });

  return def.promise;
};

/**
 * Sends request to server to query database for contents of given dir.
 * Returns array of assets.
 *
 * @param {!shapy.browser.Asset.Dir} dir Directory that we want to be queried.
 * @param {boolean} public Type of directory to query.
 *
 * @
 */
shapy.browser.BrowserService.prototype.queryDir = function(dir, public) {
  var publicSpace = (public) ? 1 : 0;
  return this.http_.get('/api/assets/dir/' + dir.id + '/' + publicSpace)
      .then(function(response) {
        var assets = [];

        // Iterate over responses, convert into assets.
        goog.array.forEach(response.data, function(item) {
          switch (item['type']) {
            case 'dir':
              assets.push(new shapy.browser.Asset.Dir(
                  item['id'], item['name'], dir));
              break;
            case 'scene':
              assets.push(new shapy.browser.Asset.Scene(
                  item['id'], item['name']), item['preview']);
              break;
            case 'texture':
              assets.push(new shapy.browser.Asset.Texture(
                  item['id'], item['name']), item['preview']);
              break;
            default:
              console.log('Wrong type in database!');
              break;
          }

        });

        return assets;
      });

};
