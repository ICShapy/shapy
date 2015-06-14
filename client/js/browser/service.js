// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.Service');

goog.require('shapy.browser.Asset');
goog.require('shapy.browser.Directory');
goog.require('shapy.browser.Scene');
goog.require('shapy.browser.Texture');



/**
 * Service that handles asset browsing.
 *
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http}           $http   The angular http service.
 * @param {!angular.$q}              $q      The angular promise service.
 * @param {!shapy.modal.Service}     shModal The modal service.
 */
shapy.browser.Service = function($http, $q, shModal) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.$q} @const */
  this.q_ = $q;

  /*
   * Cached scenes.
   * @private {!Object<string, shapy.browser.Scene>} @const
   */
  this.scenes_ = {};

  /**
   * Cached directories.
   * @private {!Object<string, shapy.browser.Directory>} @const
   */
  this.dirs_ = {};

  /**
   * Cached textures.
   * @private {!Object<string, shapy.browser.Texture>} @const
   */
  this.textures_ = {};

  /**
   * Private home dir.
   *
   * @public {shapy.browser.Directory}
   * @const
   */
  this.home = null;

  /**
   * Current directory.
   * @public {shapy.browser.Directory}
   */
  this.current = null;


  /**
   * Type of current directory.
   * @type {boolean}
   * @public
   * @export
   */
  this.private = true;

  /**
   * Path to current folder.
   * @public {Array.<shapy.browser.Directory>}
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
 * Clears caches with assets.
 *
 */
shapy.browser.Service.prototype.clearAllCache = function() {
  this.scenes_ = {};
  this.dirs_ = {};
  this.textures_ = {};
};


/**
 * Updates data regarding current directory.
 *
 * @param {!shapy.browser.Directory} dir Dir entered.
 */
shapy.browser.Service.prototype.changeDirectory = function(dir) {
  // Update current dir and its type.
  this.current = dir;
  this.private = dir.id >= 0;

  // If entered private dir, update path.
  if (this.private) {
    // Compose new path to current dir.
    var newPath = [dir];
    var current = dir;
    while (current.parent !== null) {
      current = current.parent;
      newPath.push(current);
    }
    newPath.reverse();

    this.path = newPath;
  }
};


/**
 * Returns default name for assets
 *
 * @param {shapy.browser.Asset.Type} type Type of asset for which we return name
 *
 * @return {string}
 */
shapy.browser.Service.prototype.defaultName = function(type) {
  switch (type) {
    case shapy.browser.Asset.Type.DIRECTORY: return 'Untitled Folder';
    case shapy.browser.Asset.Type.SCENE: return 'Untitled Scene';
    case shapy.browser.Asset.Type.TEXTURE: return 'Untitled Texture';
    default: return 'Untitled';
  }
};


/**
 * Creates a new asset.
 *
 * @private
 *
 * @param {string}                  url    URL of the resource.
 * @param {!Object<string, Object>} cache  Cache for the resource.
 * @param {Function}                cons   Asset constructor.
 * @param {=Object}                 params Optional params.
 *
 * @return {!angular.$q} Promise to return a new asset.
 */
shapy.browser.Service.prototype.create_ = function(url, cache, cons, params) {
  var parent = this.current;
  // Request new asset from server.
  var allParams = $.extend({ parent: parent.id }, params);
  return this.http_.post(url, allParams)
      .then(goog.bind(function(response) {
        // Create asset representation, cache it, update parent/child refs.
        var asset = new cons(this, response.data.id, response.data);
        cache[asset.id] = asset;
        parent.children.push(asset);
        asset.parent = parent;
      }, this));
};


/**
 * Creates new dir.
 *
 * @return {!angular.$q} Promise to return a new dir.
 */
shapy.browser.Service.prototype.createDir = function() {
  return this.create_('/api/assets/dir', this.dirs_, shapy.browser.Directory);
};


/**
 * Creates a new scene.
 *
 * @return {!angular.$q} Promise to return a new scene.
 */
shapy.browser.Service.prototype.createScene = function() {
  return this.create_(
      '/api/assets/scene',
      this.scenes_,
      shapy.browser.Scene);
};


/**
 * Creates a new texture.
 *
 * @param {string} texture New texture.
 *
 * @return {!angular.$q} Promise to return a new texture.
 */
shapy.browser.Service.prototype.createTexture = function(texture) {
  return this.create_(
      '/api/assets/texture',
      this.textures_,
      shapy.browser.Texture,
      {'data': texture});
};




/**
 * Fetches asset.
 *
 * @private
 *
 * @param {string}                  url   URL of the resource.
 * @param {!Object<string, Object>} cache Cache for the resource.
 * @param {Function}                cons  Asset constructor.
 * @param {string}                  id    ID of the resource.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.get_ = function(url, cache, cons, id) {
  if (!goog.isDef(id)) {
    return this.q_.reject({ error: 'Invalid ID.' });
  }

  var asset;
  // Check cache.
  if (goog.object.containsKey(cache, id)) {
    asset = cache[id];
    // Return if asset loaded.
    if (asset.ready) {
      return asset.ready.promise;
    }
  } else {
    // Construct (unloaded) asset.
    asset = new cons(this, id);
    cache[id] = asset;
  }

  // Request asset data from server.
  asset.ready = this.q_.defer();
  this.http_.get(url, {params: { id: id }})
    .then(goog.bind(function(response) {
      asset.load(response.data);
      asset.ready.resolve(asset);
    }, this), function() {
      asset.ready.reject();
    });

  return asset.ready.promise;
};


/**
 * Returns all resources that match a filter.
 *
 * @private
 *
 * @param {string}                  url   URL of the resource.
 * @param {!Object<string, Object>} cache Cache for the resource.
 * @param {Function}                cons  Asset constructor.
 * @param {string} name Name filter.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.filter_ = function(url, cache, cons, name) {
  return this.http_.get(url, {params: {name: name }})
    .then(goog.bind(function(data) {
      return goog.array.map(data.data || [], function(data) {
          var asset = new cons(this, data.id, data);
          cache[data.id] = asset;
          return asset;
      }, this);
    }, this));
};


/**
 * Fetches a dir from the server or from local storage.
 *
 * @param {number} dirID ID of the directory.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.getDir = function(dirID) {
  return this.get_(
      '/api/assets/dir',
      this.dirs_,
      shapy.browser.Directory,
      dirID
  );
};


/**
 * Fetches a scene from the server or from local storage.
 *
 * @param {number} sceneID ID of the scene.
 *
 * @return {!angular.$q} Promise to return the scene.
 */
shapy.browser.Service.prototype.getScene = function(sceneID) {
  return this.get_(
      '/api/assets/scene',
      this.scenes_,
      shapy.browser.Scene,
      sceneID
  );
};


/**
 * Fetches a texture from the server or from local storage.
 *
 * @param {number} textureID ID of the scene.
 *
 * @return {!angular.$q} Promise to return the scene.
 */
shapy.browser.Service.prototype.getTexture = function(textureID) {
  return this.get_(
      '/api/assets/texture',
      this.textures_,
      shapy.browser.Texture,
      textureID
  );
};


/**
 * Fetches some textures that match a name.
 *
 * @param {name} name Name filter.
 *
 * @return {!angular.$q} Promise to return the scene.
 */
shapy.browser.Service.prototype.filterTextures = function(name) {
  return this.filter_(
      '/api/assets/textures',
      this.textures_,
      shapy.browser.Texture,
      name
  );
};


/**
 * Fetches public space from the server or from local storage.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.getPublic = function() {
  return this.get_(
      '/api/assets/public',
      this.dirs_,
      shapy.browser.Directory,
      shapy.browser.Asset.Space.PUBLIC
  );
};

/**
 * Fetches shared space from the server or from local storage.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.getShared = function() {
  return this.get_(
      '/api/assets/shared',
      this.dirs_,
      shapy.browser.Directory,
      shapy.browser.Asset.Space.SHARED
  );
};


/**
 * Fetches filtered space from the server or from local storage.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.getFiltered = function(id) {
  return this.get_(
      '/api/assets/filtered',
      this.dirs_,
      shapy.browser.Directory,
      id
  );
};


/**
 * Renames asset.
 *
 * @private
 *
 * @param {string}               url   URL of the resource.
 * @param {!shapy.browser.Asset} asset Asset to rename.
 * @param {string}               name  New name.
 */
shapy.browser.Service.prototype.rename_ = function(url, asset, name) {
  this.http_.put(url, {
    id: asset.id,
    name: name
  }).then(function() {
      asset.name = name;
  });
};


/**
 * Renames dir.
 *
 * @param {!shapy.browser.Directory} dir  Dir to rename.
 * @param {string}                   name New name.
 */
shapy.browser.Service.prototype.renameDir = function(dir, name) {
  this.rename_('/api/assets/dir', dir, name);
};


/**
 * Renames scene.
 *
 * @param {!shapy.browser.Scene} scene Scene to rename.
 * @param {string}                     name  New name.
 */
shapy.browser.Service.prototype.renameScene = function(scene, name) {
  this.rename_('/api/assets/scene', scene, name);
};


/**
 * Renames texture.
 *
 * @param {!shapy.browser.Texture} texture Texture to rename.
 * @param {string}                 name    New name.
 */
shapy.browser.Service.prototype.renameTexture = function(texture, name) {
  this.rename_('/api/assets/texture', texture, name);
};


/**
 * Deletes asset.
 *
 * @private
 *
 * @param {string}                  url   URL of the resource.
 * @param {!shapy.browser.Asset}    asset Asset to rename.
 * @param {!Object<string, Object>} cache Cache for the resource.
 */
shapy.browser.Service.prototype.delete_ = function(url, asset, cache) {
  // Early return for faulty deletes
  if (asset.id <= 0)
    return;

  // Delete on server
  this.http_.delete(url, {params: {id: asset.id}}).then(goog.bind(function() {
    // Update parent
    this.current.children = this.current.children.filter(function(child) {
      return asset.id !== child.id;
    });
    // Clean cache
    this.removefromCache(asset);
  }, this));
};




/**
 * Recursively removes assets from caches
 *
 * @param {!shapy.browser.Asset}    asset Asset which (with children) we remove.
 */
shapy.browser.Service.prototype.removefromCache = function(asset) {
  switch (asset.type) {
    case shapy.browser.Asset.Type.DIRECTORY:
      goog.object.remove(asset.shBrowser_.dirs_, asset.id);
      break;
    case shapy.browser.Asset.Type.SCENE:
      goog.object.remove(asset.shBrowser_.scenes_, asset.id);
      break;
    case shapy.browser.Asset.Type.TEXTURE:
      goog.object.remove(asset.shBrowser_.textures_, asset.id);
      break;
  }
  if (asset.children) {
    goog.array.forEach(asset.children, asset.shBrowser_.removefromCache);
  }
};


/**
 * Deletes dir.
 *
 * @param {!shapy.browser.Directory} dir  Dir to delete.
 */
shapy.browser.Service.prototype.deleteDir = function(dir) {
  this.delete_('/api/assets/dir', dir, this.dirs_);
};


/**
 * Deletes scene.
 *
 * @param {!shapy.browser.Scene} scene Scene to delete.
 */
shapy.browser.Service.prototype.deleteScene = function(scene) {
  this.delete_('/api/assets/scene', scene, this.scenes_);
};


/**
 * Deletes texture.
 *
 * @param {!shapy.browser.Texture} texture Texture to delete.
 */
shapy.browser.Service.prototype.deleteTexture = function(texture) {
  this.delete_('/api/assets/texture', texture, this.textures_);
};


/**
 * Fetches permissions data for given asset.
 *
 * @param {!shapy.browser.Asset} asset Asset which sharing status we check.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.getPermissions = function(asset) {
  return this.http_.get('/api/permissions', {params: { id: asset.id }})
    .then(goog.bind(function(response) {
      return goog.array.map(response.data, function(permission) {
        return new shapy.browser.Permission(
            0,
            permission['email'],
            permission['write']);
      });
    }, this));
};


/**
 * Sets permissions for given asset.
 *
 * @param {!shapy.browser.Asset}              asset
 *        Asset which sharing status we check.
 * @param {!Array.<shapy.browser.Permission>} permissions New permissions set.
 *
 * @return {!angular.$q}
 */
shapy.browser.Service.prototype.setPermissions = function(asset, permissions) {
  return this.http_.post('/api/permissions', {
    id: asset.id,
    permissions: JSON.stringify(goog.array.map(permissions, function(perm) {
      return [perm.email, perm.write];
    }))
  });
};


/**
 * Sets public/private setting of an asset.
 *
 * @private
 *
 * @param {string}               url    URL of the resource.
 * @param {!shapy.browser.Asset} asset  Asset which public/private setting we change.
 * @param {boolean}              public New public/private setting.
 */
shapy.browser.Service.prototype.setPublic_ = function(url, asset, public) {
  return this.http_.put(url, {
    id: asset.id,
    public: (public) ? 1 : 0,
  }).then(function() {
      asset.public = public;
  });
};


/**
 * Sets public/private setting of a scene.
 *
 * @param {!shapy.browser.Scene} scene  Scene which public setting we update.
 * @param {boolean}              public New public/private setting.
 */
shapy.browser.Service.prototype.setPublicScene = function(scene, public) {
  this.setPublic_('/api/assets/scene', scene, public);
};


/**
 * Sets public/private setting of a texture.
 *
 * @param {!shapy.browser.Texture} texture Texture which public setting we update.
 * @param {boolean}                public  New public/private setting.
 */
shapy.browser.Service.prototype.setPublicTexture = function(texture, public) {
  this.setPublic_('/api/assets/texture', texture, public);
};



/**
 * Class representing permission type of user for an asset.
 *
 *
 * @constructor
 *
 * @param {number}  id    ID of the user.
 * @param {string}  email Email of the user.
 * @param {boolean} write Write permission
 */
shapy.browser.Permission = function(id, email, write) {
  this.id = id;
  this.email = email;
  this.write = write;
};

