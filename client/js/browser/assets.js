// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.AssetsService');
goog.provide('shapy.browser.Asset');
goog.provide('shapy.browser.Asset.Dir');
goog.provide('shapy.browser.Asset.Scene');
goog.provide('shapy.browser.Asset.Texture');

goog.require('shapy.browser.BrowserController');



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
 * @param {string} image Path to image to be displayed for asset in browser.
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
   * Path to image to be displayed for asset in browser.
   * @public {string}
   * @const
   */
  this.image = image;
};

/**
 * Enters asset.
 *
 * @public
 */
shapy.browser.Asset.prototype.enter = goog.abstractMethod;



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
  shapy.browser.Asset.call(this, id, name, "/img/folder.png");
};
goog.inherits(shapy.browser.Asset.Dir, shapy.browser.Asset);

/**
 * Enters directory - queries database and displays new dir.
 *
 * @param {!shapy.browser.BrowserController} controller Ctrl for browser.htm;
 */
shapy.browser.Asset.Dir.prototype.enter =  function(controller) {
  // Query database.
  assets = []
  var hundreds = (this.id + 99) / 100
  for (var i = hundreds * 100 + 1; i <= (hundreds + 1) * 100; ++i) {
    assets.push(new shapy.browser.Asset.Dir(i, 'dir' + i));
  }
  // Ask controller to display new dir contents.
  controller.displayDir(this, assets);
};



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
  shapy.browser.Asset.call(this, id, name, image);
};
goog.inherits(shapy.browser.Asset.Scene, shapy.browser.Asset);

/**
 * Enters Scene.
 *
 * @param {!shapy.browser.BrowserController} controller Ctrl for browser.htm;
 */
shapy.browser.Asset.Scene.prototype.enter =  function(controller) {
  console.log("Asset.Scene.prototype.enter - UNIMPLEMENTED");
};



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
  shapy.browser.Asset.call(this, id, name, image);
};
goog.inherits(shapy.browser.Asset.Texture, shapy.browser.Asset);

/**
 * Enters Texture.
 *
 * @param {!shapy.browser.BrowserController} controller Ctrl for browser.htm;
 */
shapy.browser.Asset.Texture.prototype.enter =  function(controller) {
  console.log("Asset.Texture.prototype.enter - UNIMPLEMENTED");
};




