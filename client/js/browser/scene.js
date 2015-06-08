// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.Asset.Scene');

goog.require('shapy.browser.Asset');
goog.require('shapy.editor.Object');
goog.require('shapy.editor.create');



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
  this.name = data['name'] || this.shBrowser_.defaultName(this.type);

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

  this.image = (opt_data && opt_data['preview']) || '/img/scene.svg';
};
goog.inherits(shapy.browser.Asset.Scene, shapy.browser.Asset);


/**
 * Loads the asset data.
 *
 * @param {Object} data
 */
shapy.browser.Asset.Scene.prototype.load = function(data) {
  // Fill in the name if unknown.
  this.name = data.name || this.shBrowser_.defaultName(this.type);

  // Fill in permission flags
  this.owner = !(!(data.owner));
  this.write = !(!(data.write));
  this.loaded = true;

  console.log(data);
};


/**
 * Saves the asset data.
 */
shapy.browser.Asset.Scene.prototype.save = function() {
  // TODO(nandor): remove me
  return;

  this.shBrowser_.http_.put('/api/assets/scene', {
    id: this.id,
    name: this.name,
    data: JSON.stringify(this.toJSON())
  });
};


/**
 * Serializes the scene.
 *
 * @return {Object} Serializable JSON.
 */
shapy.browser.Asset.Scene.prototype.toJSON = function() {
  return {
    id: this.id,
    objects: goog.object.map(this.objects, function(object) {
      return object.toJSON();
    })
  };
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
    return obj.pickRay(ray, mode);
  });
  hits = goog.array.flatten(hits);

  // Find all allowed objects in the current mode.
  if (!mode.object) {
    hits = goog.array.filter(hits, function(hit) {
      if (hit.item.type == 'object') {
        return mode.object;
      } else if (hit.item.type == 'face') {
        return mode[hit.item.type] || mode.paint;
      } else {
        return mode[hit.item.type];
      }
    });
  }

  if (goog.array.isEmpty(hits)) {
    return null;
  }

  goog.array.sort(hits, function(a, b) {
    var da = goog.vec.Vec3.distance(ray.origin, a.point);
    var db = goog.vec.Vec3.distance(ray.origin, b.point);
    return da - db;
  }, this);

  return mode.object ? hits[0].item.object : hits[0].item;
};


/**
 * Picks a group of objects intersection a frustum.
 *
 * @param {!Array<Object>}         frustum  Frostrum.
 * @param {!shapy.editor.Mode}     mode     Current selection mode.
 *
 * @return {!shapy.editor.EditableGroup}
 */
shapy.browser.Asset.Scene.prototype.pickFrustum = function(frustum, mode) {
  var hits = goog.array.map(goog.object.getValues(this.objects), function(obj) {
    return goog.array.filter(obj.pickFrustum(frustum), function(hit) {
      return mode[hit.type];
    });
  });
  return goog.array.flatten(hits);
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
  var object = shapy.editor.create.cube(id, this, w, h, d);
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
  var object = shapy.editor.create.sphere(id, this, r, slices, stacks);
  this.objects[id] = object;
  return object;
};
