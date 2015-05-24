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
};




/**
 * Class representing an asset.
 *
 * @constructor
 *
 * @param {number} id    Id of the asset.
 * @param {string} name  Name of the asset.
 * @param {!Image} image Image to be displayed for asset in browser.
 */
shapy.browser.Asset = function(id, name, image) {
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
   * Image to be displayed for asset in browser.
   * @public {!Image}
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
  var folder = new Image();
  folder.src = "../../img/folder.png";
  shapy.browser.Asset.call(this, id, name, folder);
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
 * @param {!Image} image Image to be displayed for asset in browser.
 */
shapy.browser.Asset.Scene = function(id, name, image) {
  shapy.browser.Asset.call(this, id, name, image);
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
 * @param {!Image} image Image to be displayed for asset in browser.
 */
shapy.browser.Asset.Texture = function(id, name, image) {
  shapy.browser.Asset.call(this, id, name, image);
};
goog.inherits(shapy.browser.Asset.Texture, shapy.browser.Asset);




