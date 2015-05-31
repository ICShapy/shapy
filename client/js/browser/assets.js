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
   * Promise resolved when the asset is loaded.
   * @public {!angular.$q}
   */
  this.ready = null;

  /**
   * Name of the asset.
   * @public {string} @const
   */
  this.name = data['name'] || '';

  /**
   * Path to image to be displayed for asset in browser.
   * @public {string} @const
   */
  this.image = data['image'] || '';

  /**
   * Parent directory of this directory.
   * @public {shapy.browser.Asset.Dir} @const
   */
  this.parent = null;
};


/**
 * Saves an asset on the server.
 */
shapy.browser.Asset.prototype.saves = goog.abstractMethod;


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
 * Creates an asset representing a directory.
 *
 * @constructor
 * @extends {shapy.browser.Asset}
 *
 * @param {!shapy.browser.Service} shBrowser Browser service.
 * @param {number}                 id        ID of the directory.
 * @param {=Object}                opt_data  Source data.
 */
shapy.browser.Asset.Dir = function(shBrowser, id, opt_data) {
  shapy.browser.Asset.call(
      this,
      shBrowser,
      id,
      shapy.browser.Asset.Type.DIRECTORY,
      opt_data);

  /**
   * Child assets of this directory.
   * @public {!Array<!shapy.browser.Asset>}
   */
  this.children = [];

  // If data provides child list, resolve promise.
  if (opt_data && opt_data.data) {
    this.load(opt_data);
    this.ready = this.shBrowser_.q_.when(this);
  }

  // Hardcoded image for directories.
  this.image = '/img/folder.png';
};
goog.inherits(shapy.browser.Asset.Dir, shapy.browser.Asset);


/**
 * Checks if the directory has subdirectories.
 *
 * @return {boolean} True if folder has subdirectories.
 */
shapy.browser.Asset.Dir.prototype.hasSubdirs = function() {
  return !this.ready || goog.array.some(this.children, function(child) {
    return child.type == shapy.browser.Asset.Type.DIRECTORY;
  }, this);
};


/**
 * Loads the directory data.
 *
 * @param {!Object} data Data from the server.
 */
shapy.browser.Asset.Dir.prototype.load = function(data) {
  // Fill in the name if uknown.
  this.name = data.name || 'Untitled Directory';

  // Fill in child directories.
  goog.array.forEach(data['data'], function(c) {
    var asset;

    switch (c['type']) {
      case shapy.browser.Asset.Type.DIRECTORY: {
        if (goog.object.containsKey(this.shBrowser_.dirs_, c.id)) {
          asset = this.shBrowser_.dirs_[c.id];
        } else {
          asset = new shapy.browser.Asset.Dir(this.shBrowser_, c.id, c);
          this.shBrowser_.dirs_[c.id] = asset;
        }
        break;
      }
      case shapy.browser.Asset.Type.SCENE: {
        if (goog.object.containsKey(this.shBrowser_.scenes_, c.id)) {
          asset = this.shBrowser_.scenes_[c.id];
        } else {
          asset = new shapy.browser.Asset.Scene(this.shBrowser_, c.id, c);
          this.shBrowser_.scenes_[c.id] = asset;
        }
        break;
      }
      case shapy.browser.Asset.Type.TEXTURE: {
        if (goog.object.containsKey(this.shBrowser_.textures_, c.id)) {
          asset = this.shBrowser_.textures_[c.id];
        } else {
          asset = new shapy.browser.Asset.Texture(this.shBrowser_, c.id, c);
          this.shBrowser_.textures_[c.id] = asset;
        }
        break;
      }
    }

    this.children.push(asset);
  }, this);
};
