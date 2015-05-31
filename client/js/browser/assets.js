// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.Asset');
goog.provide('shapy.browser.Asset.Dir');
goog.provide('shapy.browser.Asset.Scene');
goog.provide('shapy.browser.Asset.Texture');




/**
 * Class representing an asset.
 *
 * @constructor
 *
 * @param {number} id    Id of the asset.
 * @param {string} name  Name of the asset.
 * @param {string} type  Type of the asset.
 * @param {string} image Path to image to be displayed for asset in browser.
 * @param {Array.<shapy.browser.Asset.Dir>} parent Parent dir of this dir.
 */
shapy.browser.Asset = function(id, name, type, image, parent) {

  /**
   * Id of the asset.
   * @public {number} @const
   */
  this.id = id;

  /**
   * Name of the asset.
   * @public {string} @const
   */
  this.name = name;

  /**
   * Type of the asset.
   * @public {string} @const
   */
  this.type = type;

  /**
   * Path to image to be displayed for asset in browser.
   * @public {string} @const
   */
  this.image = image;

  /**
   * Parent directory of this directory.
   * @public {shapy.browser.Asset.Dir} @const
   */
  this.parent = parent;
};


/**
 * Enumeration of asset types.
 * @enum {string}
 */
shapy.browser.Asset.Type = {
  DIR: 'dir',
  SCENE: 'scene',
  TEXTURE: 'texture'
};



/**
 * Creates an asset representing a directory.
 *
 * @constructor
 * @extends {shapy.browser.Asset}
 *
 * @param {number} id    Id of the asset.
 * @param {string} name  Name of the asset.
 * @param {Array.<shapy.browser.Asset.Dir>} parent Parent dir of this dir.
 */
shapy.browser.Asset.Dir = function(id, name, parent) {
  shapy.browser.Asset.call(
      this,
      id,
      name,
      shapy.browser.Asset.Type.DIR,
      '/img/folder.png',
      parent);

  // TODO: merge these to array, on the frontend try using a filter that
  // only loops through subdirectories, textures or images.

  /**
   * Subdirectories of this directory.
   * @public {Array.<shapy.browser.Asset.Dir>}
   */
  this.subdirs = [];

  /**
   * Not-dir assets of this directory.
   * @public {Array.<shapy.browser.Asset>}
   */
  this.otherAssets = [];

  /**
   * Flag showing whether the asset data was loaded.
   * @public {boolean}
   */
  this.loaded = false;

  // TODO: have the browser service manage this field.

  // Update parent's subdir.
  if (parent !== null) {
    parent.subdirs.push(this);
  }
};
goog.inherits(shapy.browser.Asset.Dir, shapy.browser.Asset);


/**
 * Checks if the directory has subdirectories.
 *
 * @return {boolean} True if folder has subdirectories.
 */
shapy.browser.Asset.Dir.prototype.hasSubdirs = function() {
  return !this.loaded || !goog.array.isEmpty(this.subdirs);
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
 * @param {Array.<!shapy.browser.Asset.Dir>} parent Parent dir of this dir.
 */
shapy.browser.Asset.Texture = function(id, name, image, parent) {
  shapy.browser.Asset.call(
      this,
      id,
      name,
      shapy.browser.Asset.Type.TEXTURE,
      image);

  // Update parent's non-dir assets
  parent.otherAssets.push(this);
};
goog.inherits(shapy.browser.Asset.Texture, shapy.browser.Asset);

