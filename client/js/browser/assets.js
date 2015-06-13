// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.Asset');



/**
 * Class representing an asset.
 *
 * @constructor
 *
 * @param {!shapy.browser.Service}    shBrowser Browser service.
 * @param {number}                    id        ID of the asset.
 * @param {!shapy.browser.Asset.Type} type      Type of the asset.
 * @param {=Object}                   opt_data  Source data.
 */
shapy.browser.Asset = function(shBrowser, id, type, opt_data) {
  var data = opt_data || {};

  /** @private {!shapy.browser.Service} @const */
  this.shBrowser_ = shBrowser;

  /**
   * ID of the asset.
   * @public {number} @const
   */
  this.id = id;

  /**
   * Type of the asset.
   * @public {string} @const
   */
  this.type = type;

  /**
   * Flag showing if user is the asset owner.
   * @public {boolean} @const
   */
  this.owner = !(!(data['owner']));

  /**
   * ID of the owner.
   * @public {number} @const
   */
  this.owner_id = data['owner_id'];

  /**
   * Write permission.
   * @public {bolean} @const
   */
  this.write = !(!(data['write']));

  /**
   * Flag showing if asset is public.
   * @public {bolean} @const
   */
  this.public = !(!(data['public']));

  /**
   * Promise resolved when the asset is loaded.
   * @public {!angular.$q}
   */
  this.ready = null;

  /**
   * Flag set to true when loading finishes.
   */
  this.loaded = false;

  /**
   * Name of the asset.
   * @public {string} @const
   */
  this.name = data['name'] || this.shBrowser_.defaultName(this.type);

  /**
   * Image to be displayed for asset in browser.
   * @public {string} @const
   */
  this.image = '';

  /**
   * Parent directory of this directory.
   * @public {shapy.browser.Directory} @const
   */
  this.parent = null;
};


/**
 * Loads the asset data.
 */
shapy.browser.Asset.prototype.load = goog.abstractMethod;



/**
 * Enumeration of asset types.
 * @enum {string}
 */
shapy.browser.Asset.Type = {
  DIRECTORY: 'dir',
  SCENE: 'scene',
  TEXTURE: 'texture'
};



/**
 * Enumeration of asset spaces.
 * @enum {number}
 */
shapy.browser.Asset.Space = {
  PUBLIC: -1,
  SHARED: -2,
  TEXTURES: -3,
  SCENES: -4
};
