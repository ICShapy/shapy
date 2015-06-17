// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.Directory');



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
shapy.browser.Directory = function(shBrowser, id, opt_data) {
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
    this.ready = this.shBrowser_.q_.defer();
    this.ready.resolve(this);
  }

  // Set preview.
  this.image = '/img/folder.png';
};
goog.inherits(shapy.browser.Directory, shapy.browser.Asset);


/**
 * Checks if the directory has subdirectories.
 *
 * @return {boolean} True if folder has subdirectories.
 */
shapy.browser.Directory.prototype.hasSubdirs = function() {
  return !this.loaded || goog.array.some(this.children, function(child) {
    return child.type == shapy.browser.Asset.Type.DIRECTORY;
  }, this);
};


/**
 * Loads the directory data.
 *
 * @param {!Object} data Data from the server.
 */
shapy.browser.Directory.prototype.load = function(data) {
  // Fill in the name if unknown.
  this.name = data.name || this.shBrowser_.defaultName(this.type);
  // Fill in permission flags
  this.owner = !(!(data.owner));
  this.write = !(!(data.write));
  this.public = !(!(data.public));
  this.email = data.email || 'You';

  // Fill in child assets.
  goog.array.forEach(data['data'], function(child) {
    var asset;

    switch (child['type']) {
      case shapy.browser.Asset.Type.DIRECTORY: {
        if (goog.object.containsKey(this.shBrowser_.dirs_, child.id)) {
          asset = this.shBrowser_.dirs_[child.id];
        } else {
          asset = new shapy.browser.Directory(this.shBrowser_, child.id, child);
          this.shBrowser_.dirs_[child.id] = asset;
        }
        break;
      }
      case shapy.browser.Asset.Type.SCENE: {
        if (goog.object.containsKey(this.shBrowser_.scenes_, child.id)) {
          asset = this.shBrowser_.scenes_[child.id];
        } else {
          asset = new shapy.browser.Scene(this.shBrowser_, child.id, child);
          this.shBrowser_.scenes_[child.id] = asset;
        }
        break;
      }
      case shapy.browser.Asset.Type.TEXTURE: {
        if (goog.object.containsKey(this.shBrowser_.textures_, child.id)) {
          asset = this.shBrowser_.textures_[child.id];
        } else {
          asset = new shapy.browser.Texture(this.shBrowser_, child.id, child);
          this.shBrowser_.textures_[child.id] = asset;
        }
        break;
      }
    }

    // Set parent only if parent from private space
    if (this.id >= 0) {
      asset.parent = this;
    }
    // Update children list
    this.children.push(asset);
  }, this);

  this.loaded = true;
};
