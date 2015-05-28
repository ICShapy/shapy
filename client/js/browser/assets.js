// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.AssetsService');
goog.provide('shapy.browser.Asset');
goog.provide('shapy.browser.Asset.Dir');
goog.provide('shapy.browser.Asset.Scene');
goog.provide('shapy.browser.Asset.Texture');



/**
 * Service that handles asset browsing.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http} $http The angular http service.
 * @param {!angular.$q}    $q    The angular promise service.
 */
shapy.browser.AssetsService = function($http, $q) {
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
   this.home = new shapy.browser.Asset.Dir(0, 'home');
};

/**
 * Injects new dir into databse and returns a promise with response.
 *
 * @param {string} name      Name of the directory
 * @param {boolean} public   Flag showing whether dir is publicly accessible
 * @param {Asset.Dir} parent Parent directory
 */
shapy.browser.AssetsService.prototype.createDir = function(name, public, parent) {
  var def = this.q_.defer();

  // TODO: check if name unique in this dir

  // Inject into database, obtain id
  this.http_.post('/api/assets/create', {
    name: name,
    type: 'dir',
    public: public,
    parent: parent
  })
  .success(function(response) {
    def.resolve(new shapy.browser.Asset.Dir(response['id'], name));
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
 */
shapy.browser.AssetsService.prototype.queryDir = function(dir, public) {
  publicSpace = (public) ? 1 : 0;
  assets = [];
  this.http_.get('/api/assets/dir/' + dir.id + '/' + publicSpace)
      .success(function(response) {
        // Iterate over responses, convert into assets.
        goog.array.forEach(response, function(item) {
          switch (item['type']) {
            case 'dir'     :
              assets.push(new shapy.browser.Asset.Dir(item['id'],
                                                      item['name']));
              break;
            case 'scene'   :
              assets.push(new shapy.browser.Asset.Scene(item['id'],
                                                        item['name']),
                                                        item['preview']);
              break;
            case 'texture' :
              assets.push(new shapy.browser.Asset.Texture(item['id'],
                                                        item['name']),
                                                        item['preview']);
              break;
            default        : console.log("Wrong type in database!");
          }
        });
      });

  return assets;
};



/**
 * Class representing an asset.
 *
 * @constructor
 *
 * @param {number} id    Id of the asset.
 * @param {string} type  Type of the asset.
 * @param {string} name  Name of the asset.
 * @param {string} image Path to image to be displayed for asset in browser.
 */
shapy.browser.Asset = function(id, name, type, image) {
  /**
   * Id of the asset.
   * @public {number}
   * @const
   */
  this.id = id;

  /**
   * Name of the asset.
   * @public {string}
   * @const
   */
  this.name = name;

  /**
   * Type of the asset.
   * @public {string}
   * @const
   */
  this.type = type;

  /**
   * Path to image to be displayed for asset in browser.
   * @public {string}
   * @const
   */
  this.image = image;
};


/**
 * Creates an asset representing a directory.
 *
 * @constructor
 * @extends {shapy.browser.Asset}
 *
 * @param {number} id    Id of the asset.
 * @param {string} name  Name of the asset.
 */
shapy.browser.Asset.Dir = function(id, name) {
  shapy.browser.Asset.call(this, id, name, 'dir', "/img/folder.png");
};
goog.inherits(shapy.browser.Asset.Dir, shapy.browser.Asset);



/**
 * Creates an asset representing a scene.
 *
 * @constructor
 * @extends {shapy.browser.Asset}
 *
 * @param {number} id    Id of the asset.
 * @param {string} name  Name of the asset.
 * @param {string} image Path to image to be displayed for asset in browser.
 */
shapy.browser.Asset.Scene = function(id, name, image) {
  shapy.browser.Asset.call(this, id, name, 'scene', image);
};
goog.inherits(shapy.browser.Asset.Scene, shapy.browser.Asset);



/**
 * Creates an asset representing a texture.
 *
 * @constructor
 * @extends {shapy.browser.Texture}
 *
 * @param {number} id    Id of the asset.
 * @param {string} name  Name of the asset.
 * @param {string} image Path to image to be displayed for asset in browser.
 */
shapy.browser.Asset.Texture = function(id, name, image) {
  shapy.browser.Asset.call(this, id, name, 'texture', image);
};
goog.inherits(shapy.browser.Asset.Texture, shapy.browser.Asset);




