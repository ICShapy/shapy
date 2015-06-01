// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.Asset.Scene');

goog.require('shapy.browser.Asset');
goog.require('shapy.editor.Object');



/**
 * Class encapsulating all information about a scene.
 *
 * @constructor
 * @extends {shapy.browser.Asset}
 *
 * @param {!shapy.browser.Service} shBrowser The browser service.
 * @param {string}                 id        ID of the scene.
 * @param {=Object}                opt_data  Data from the server.
 */
shapy.browser.Asset.Scene = function(shBrowser, id , opt_data) {
  shapy.browser.Asset.call(
      this,
      shBrowser,
      id,
      shapy.browser.Asset.Type.SCENE,
      opt_data);
  var data = opt_data || {};

  /**
   * ID of the scene.
   * @public {string} @const
   */
  this.id = id;

  /**
   * Name of the scene.
   * @public {string}
   */
  this.name = data['name'] || 'Untitled Scene';

  /**
   * List of users editing the scene.
   * @public {Array<string>}
   */
  this.users = data['users'] || [];

  /**
   * List of objects in the scene.
   * @public {!Object<string, shapy.Object>}
   */
  this.objects = {};

  /**
   * Next identifier.
   * @private {string}
   */
  this.nextID_ = 0;

  // Preview image.
  this.image = data['preview'] || '/img/scene.svg';
};
goog.inherits(shapy.browser.Asset.Scene, shapy.browser.Asset);


/**
 * Loads the asset data.
 *
 * @param {Object} data
 */
shapy.browser.Asset.Scene.prototype.load = function(data) {
  this.loaded = true;
};


/**
 * Generates a new object ID.
 *
 * @return {string} Unique Object ID.
 */
shapy.browser.Asset.Scene.prototype.getNextID = function() {
  var id = this.nextID_;
  this.nextID_++;
  return 'obj_' + id;
};


/**
 * Adds a new user to the list of people editing.
 *
 * @param {string} user
 */
shapy.browser.Asset.Scene.prototype.addUser = function(user) {
  goog.array.insert(this.users, user);
};


/**
 * Removes a user from the list of people editing.
 *
 * @param {string} user
 */
shapy.browser.Asset.Scene.prototype.removeUser = function(user) {
  goog.array.remove(this.users, user);
};


/**
 * Sets the list of users.
 *
 * @param {string} users
 */
shapy.browser.Asset.Scene.prototype.setUsers = function(users) {
  this.users = users;
};


/**
 * Picks an object intersected by a ray.
 *
 * @param {!goog.vec.Ray}         ray
 * @param {!shapy.editor.Mode}    mode
 *
 * @return {!shapy.editor.Editable}
 */
shapy.browser.Asset.Scene.prototype.pickRay = function(ray, mode) {
  // Find all the editable parts that intersect the ray.
  var hits = goog.array.map(goog.object.getValues(this.objects), function(obj) {
    return obj.pickRay(ray);
  });
  hits = goog.array.flatten(hits);

  // Find all allowed objects in the current mode.
  hits = goog.array.filter(hits, function(hit) {
    return mode[hit.item.type];
  });

  if (goog.array.isEmpty(hits)) {
    return null;
  }

  goog.array.sort(hits, function(a, b) {
    var da = goog.vec.Vec3.distance(ray.origin, a.point);
    var db = goog.vec.Vec3.distance(ray.origin, b.point);
    return da - db;
  }, this);

  return hits[0].item;
};


/**
 * Picks a group of objects intersection a frustum.
 *
 * @param {!Array<Object>}         frustum  Frostrum.
 * @param {!shapy.editor.Editable} selected Currently selected editable.
 * @param {!shapy.editor.Mode}     mode     Current selection mode.
 *
 * @return {!shapy.editor.Editable}
 */
shapy.browser.Asset.Scene.prototype.pickFrustum = function(
    frustum, selected, mode)
{
  var hits = goog.array.map(goog.object.getValues(this.objects), function(obj) {
    var ps = obj.pickFrustum(frustum);
    if (!goog.array.isEmpty(ps)) {
      ps = goog.array.concat(ps, obj);
    }
    return ps;
  });
  hits = goog.array.flatten(hits);

  // Find all allowed objects in the current mode.
  hits = goog.array.filter(hits, function(hit) {
    return mode[hit.type];
  });

  // Allow selecting multiple parts of the currently selected object only.
  if (selected && !mode[shapy.editor.Editable.Type.OBJECT]) {
    var owner = selected;
    if (selected.type == shapy.editor.Editable.Type.PARTS_GROUP) {
      owner = selected.getObject();
    }
    hits = goog.array.filter(hits, function(hit) {
      return hit.object == owner;
    });

    return goog.array.isEmpty(hits) ? null : new shapy.editor.PartsGroup(hits);
  }

  return goog.array.isEmpty(hits) ? null : new shapy.editor.ObjectGroup(hits);
};


/**
 * Creates a new object, adding it to the scene.
 *
 * @param {number} w
 * @param {number} h
 * @param {number} d
 *
 * @return {!shapy.editor.Object}
 */
shapy.browser.Asset.Scene.prototype.createCube = function(w, h, d) {
  var id = this.getNextID();
  var object = shapy.editor.Object.createCube(id, this, w, h, d);
  this.objects[id] = object;
  return object;
};


/**
 * Creates a new object, adding it to the scene.
 *
 * @param {number} r
 * @param {number} slices
 * @param {number} stacks
 *
 * @return {!shapy.editor.Object}
 */
shapy.browser.Asset.Scene.prototype.createSphere = function(r, slices, stacks) {
  var id = this.getNextID();
  var object = shapy.editor.Object.createSphere(id, this, r, slices, stacks);
  this.objects[id] = object;
  return object;
};
