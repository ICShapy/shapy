// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.Scene');

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
shapy.browser.Scene = function(shBrowser, id , opt_data) {
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
   * List of users editing the scene.
   * @public {Array<string>}
   */
  this.users = data['users'] || [];

  /**
   * List of objects in the scene.
   * @public {!Object<string, shapy.editor.Object>}
   */
  this.objects = {};

  /**
   * Next identifier.
   * @private {string}
   */
  this.nextID_ = 0;

  // Set preview
  this.image = (opt_data && opt_data['preview']) || '/img/scene.svg';
};
goog.inherits(shapy.browser.Scene, shapy.browser.Asset);


/**
 * Loads the asset data.
 *
 * @param {Object} data
 */
shapy.browser.Scene.prototype.load = function(data) {
  // Fill in the name if unknown.
  this.name = data.name || this.shBrowser_.defaultName(this.type);
  // Fill in permission flags
  this.owner = !!data.owner;
  this.write = !!data.write;
  this.public = !!data.public;
  this.loaded = true;

  // Read objects.
  if (!data.data) {
    return;
  }

  this.objects = goog.object.map(data.data.objects || {}, function(data) {
    var obj = new shapy.editor.Object(
        data.id,
        this,
        data.texture,
        data.verts || {},
        data.edges || {},
        data.faces || {},
        data.uvPoints || {},
        data.uvEdges || {});

    obj.translate_[0] = data.tx;
    obj.translate_[1] = data.ty;
    obj.translate_[2] = data.tz;

    obj.scale_[0] = data.sx;
    obj.scale_[1] = data.sy;
    obj.scale_[2] = data.sz;

    obj.rotQuat_[0] = data.rx;
    obj.rotQuat_[1] = data.ry;
    obj.rotQuat_[2] = data.rz;
    obj.rotQuat_[3] = data.rw;

    return obj;
  }, this);
};


/**
 * Saves the asset data.
 *
 * @return {!angular.$q}
 */
shapy.browser.Scene.prototype.save = function() {
  return this.shBrowser_.http_.put('/api/assets/scene', {
    id: this.id,
    name: this.name,
    data: JSON.stringify(this.toJSON()),
    preview: this.image
  });
};


/**
 * Cleans buffers.
 */
shapy.browser.Scene.prototype.destroy = function() {
  goog.object.forEach(this.objects, function(object) {
    object.dirty = true;
  }, this);
};


/**
 * Serializes the scene.
 *
 * @return {Object} Serializable JSON.
 */
shapy.browser.Scene.prototype.toJSON = function() {
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
 * @param {number} seq Sequence number used for generating unique ids.
 *
 * @return {string} Unique Object ID.
 */
shapy.browser.Scene.prototype.getNextID = function(seq) {
  var id = this.nextID_;
  this.nextID_++;
  return 'obj_' + id + '_' + seq;
};


/**
 * Adds a new user to the list of people editing.
 *
 * @param {string} user
 */
shapy.browser.Scene.prototype.addUser = function(user) {
  goog.array.insert(this.users, user);
};


/**
 * Removes a user from the list of people editing.
 *
 * @param {string} user
 */
shapy.browser.Scene.prototype.removeUser = function(user) {
  goog.array.remove(this.users, user);
};


/**
 * Sets the list of users.
 *
 * @param {string} users
 */
shapy.browser.Scene.prototype.setUsers = function(users) {
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
shapy.browser.Scene.prototype.pickRay = function(ray, mode) {
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
shapy.browser.Scene.prototype.pickFrustum = function(frustum, mode) {
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
 * @param {number} w   Width.
 * @param {number} h   Height.
 * @param {number} d   Depth.
 * @param {number} seq Sequence number to be used for generating an id.
 *
 * @return {!shapy.editor.Object}
 */
shapy.browser.Scene.prototype.createCube = function(w, h, d, seq) {
  var id = this.getNextID(seq);
  var object = shapy.editor.create.cube(id, this, w, h, d);
  this.objects[id] = object;
  return object;
};


/**
 * Creates a new object, adding it to the scene.
 *
 * @param {number} r   Radius.
 * @param {number} sli Slices.
 * @param {number} sta Stacks.
 * @param {number} seq Sequence number to be used for generating an id.
 *
 * @return {!shapy.editor.Object}
 */
shapy.browser.Scene.prototype.createSphere = function(r, sli, sta, seq) {
  var id = this.getNextID(seq);
  var object = shapy.editor.create.sphere(id, this, r, sli, sta);
  this.objects[id] = object;
  return object;
};


/**
 * Creates a new object, adding it to the scene.
 *
 * @param {number} b   Base.
 * @param {number} h   Height.
 * @param {number} seq Sequence number to be used for generating an id.
 *
 * @return {!shapy.editor.Object}
 */
shapy.browser.Scene.prototype.createPyramid = function(b, h, seq) {
  var id = this.getNextID(seq);
  var object = shapy.editor.create.pyramid(id, this, b, h);
  this.objects[id] = object;
  return object;
};


/**
 * Creates a new object, adding it to the scene.
 *
 * @param {number} a   Half side length.
 * @param {number} seq Sequence number to be used for generating an id.
 *
 * @return {!shapy.editor.Object}
 */
shapy.browser.Scene.prototype.createQuad = function(a, seq) {
  var id = this.getNextID(seq);
  var object = shapy.editor.create.quad(id, this, a);
  this.objects[id] = object;
  return object;
};
