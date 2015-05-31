// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.Scene');
goog.provide('shapy.SceneService');

goog.require('shapy.editor.Object');



/**
 * Class encapsulating all information about a scene.
 *
 * @constructor
 *
 * @param {string} id ID of the scene.
 * @param {Object} data Data from the server.
 */
shapy.Scene = function(id, data) {
  /**
   * ID of the scene.
   * @public {string} @const
   */
  this.id = id;

  /**
   * Name of the scene.
   * @public {string}
   */
  this.name = data['name'] || 'Untitled';

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
};


/**
 * Generates a new object ID.
 *
 * @return {string} Unique Object ID.
 */
shapy.Scene.prototype.getNextID = function() {
  var id = this.nextID_;
  this.nextID_++;
  return 'obj_' + id;
};


/**
 * Adds a new user to the list of people editing.
 *
 * @param {string} user
 */
shapy.Scene.prototype.addUser = function(user) {
  goog.array.insert(this.users, user);
};


/**
 * Removes a user from the list of people editing.
 *
 * @param {string} user
 */
shapy.Scene.prototype.removeUser = function(user) {
  goog.array.remove(this.users, user);
};


/**
 * Sets the list of users.
 *
 * @param {string} users
 */
shapy.Scene.prototype.setUsers = function(users) {
  this.users = users;
};


/**
 * Picks an object intersected by a ray.
 *
 * @param {!goog.vec.Ray}      ray
 * @param {!shapy.editor.Mode} mode
 *
 * @return {!shapy.editor.Editable}
 */
shapy.Scene.prototype.pickRay = function(ray, mode) {
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
shapy.Scene.prototype.pickFrustum = function(frustum, selected, mode) {
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
  if (!mode[shapy.editor.Editable.Type.OBJECT]) {
    hits = goog.array.filter(hits, function(hit) {
      return hit.object == selected;
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
shapy.Scene.prototype.createCube = function(w, h, d) {
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
shapy.Scene.prototype.createSphere = function(r, slices, stacks) {
  var id = this.getNextID();
  var object = shapy.editor.Object.createSphere(id, this, r, slices, stacks);
  this.objects[id] = object;
  return object;
};



/**
 * Retrieves a scene object from cache or server.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http} $http The Angular HTTP service.
 * @param {!angular.$q}    $q    The Angular promise service.
 */
shapy.SceneService = function($http, $q) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.$q} @const */
  this.q_ = $q;
  /** @private {!Object<string, shapy.Scene>} @const */
  this.scenes_ = {};
};


/**
 * Fetches a scene from the server or from local storage.
 *
 * @param {string} sceneID ID of the scene.
 *
 * @return {!angular.$q} Scene wrapped in a promise.
 */
shapy.SceneService.prototype.get = function(sceneID) {
  if (!sceneID) {
    throw new Error('Invalid scene ID');
  }

  var defer = this.q_.defer();

  if (goog.object.containsKey(this.scenes_, sceneID)) {
    defer.resolve(this.scenes_[sceneID]);
    return defer.promise;
  }

  this.http_.get('/api/scene/' + sceneID).success(goog.bind(function(data) {
    this.scenes_[sceneID] = new shapy.Scene(sceneID, data);
    defer.resolve(this.scenes_[sceneID]);
  }, this));

  return defer.promise;
};
