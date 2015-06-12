// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Editor');
goog.provide('shapy.editor.EditorController');

goog.require('goog.dom');
goog.require('goog.math.Size');
goog.require('goog.object');
goog.require('goog.string.format');
goog.require('goog.webgl');
goog.require('shapy.editor.Camera');
goog.require('shapy.editor.Editable');
goog.require('shapy.editor.Executor');
goog.require('shapy.editor.Layout');
goog.require('shapy.editor.Layout.Double');
goog.require('shapy.editor.Layout.Quad');
goog.require('shapy.editor.Layout.Single');
goog.require('shapy.editor.Mode');
goog.require('shapy.editor.Renderer');
goog.require('shapy.editor.Rig');
goog.require('shapy.editor.Rig.Cut');
goog.require('shapy.editor.Rig.Extrude');
goog.require('shapy.editor.Rig.Rotate');
goog.require('shapy.editor.Rig.Scale');
goog.require('shapy.editor.Rig.Translate');
goog.require('shapy.editor.Viewport');



/**
 * Minor editor controller.
 *
 * @constructor
 *
 * @param {!shapy.User}          user
 * @param {!shapy.Scene}         scene
 * @param {!shapy.editor.Editor} shEditor
 */
shapy.editor.EditorController = function(user, scene, shEditor) {
  /** @private {!shapy.Scene} @const */
  this.scene_ = scene;
  /** @private {!shapy.editor.Editor} @const */
  this.shEditor_ = shEditor;
  this.shEditor_.controller_ = this;
  /** @public {!shapy.User} @const */
  this.user = user;

  /** @public {!string} Current message */
  this.message = '';

  /** @public {} */
  this.sendMessage = function() {
    this.shEditor_.exec_.emitMessage(this.message);
    this.message = '';
  };

  /**
   * Messages stored as a pair joining a user name to a list of messages
   */
  this.messageList = [];

  // Initialise the scene.
  this.shEditor_.setScene(this.scene_, this.user);
};



/**
 * Editor service exposing all editor functionality.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http}     $http      The Angular HTTP service.
 * @param {!angular.$location} $location  The Angular location service.
 * @param {!angular.$scope}    $rootScope
 * @param {!shapy.UserService} shUser
 */
shapy.editor.Editor = function($http, $location, $rootScope, shUser) {
  /** @private {!shapy.editor.Rig} @const */
  this.rigTranslate_ = new shapy.editor.Rig.Translate();
  /** @private {!shapy.editor.Rig} @const */
  this.rigRotate_ = new shapy.editor.Rig.Rotate();
  /** @private {!shapy.editor.Rig} @const */
  this.rigScale_ = new shapy.editor.Rig.Scale();
  /** @private {!shapy.editor.Rig} @const */
  this.rigCut_ = new shapy.editor.Rig.Cut();
  /** @private {!shapy.editor.Rig} @const */
  this.rigExtrude_ = new shapy.editor.Rig.Extrude();

  /** @private {!angular.$location} @const */
  this.location_ = $location;
  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;
  /** @private {!shapy.UserService} @const */
  this.shUser_ = shUser;
  /** @private {!angular.$http} @const */
  this.http_ = $http;

  /** @private {!shapy.editor.EditorController} */
  // TODO: Another way of doing this
  this.controller_ = null;

  /**
   * Canvas.
   * @private {!HTMLCanvasElement}
   */
  this.canvas_ = null;

  /**
   * Parent element of the canvas.
   * @private {!Element}
   */
  this.parent_ = null;

  /**
   * WebGL context.
   * @private {!WebGLContext}
   */
  this.gl_ = null;

  /**
   * Current user.
   * @public {!shapy.User}
   */
  this.user = null;

  /**
   * Current scene.
   * @private {!shapy.Scene}
   */
  this.scene_ = null;

  /**
   * Renderer that manages all WebGL resources.
   * @private {shapy.editor.Renderer}
   */
  this.renderer_ = null;

  /**
   * Currently selected group of object.
   * @private {shapy.editor.ObjectGroup}
   */
  this.objectGroup_ = new shapy.editor.ObjectGroup();

  /**
   * Currently selected group of parts.
   * @private {shapy.editor.PartsGroup}
   */
  this.partGroup_ = new shapy.editor.PartsGroup();

  /**
   * Object hovered by mouse.
   * @private {!Array<!shapy.editor.Editable>}
   */
  this.hover_ = [];

  /**
   * Active rig.
   * @private {!shapy.editor.Rig}
   */
  this.rig_ = null;

  /**
   * Active layout.
   * @private {!shapy.editor.Layout}
   */
  this.layout_ = null;

  /**
   * requestAnimationFrame id.
   * @private {number}
   */
  this.frame_ = null;

  /**
   * setInterval id.
   * @private {number}
   */
  this.checkpoint_ = null;

  /**
   * Size of the canvas.
   * @private {!goog.math.Size} @const
   */
  this.vp_ = new goog.math.Size(0, 0);

  /**
   * Edit mode.
   * @public {!shapy.editor.Mode} @const
   */
  this.mode = new shapy.editor.Mode();

  /**
   * WebSocket command executor.
   * @private {!shapy.editor.Executor}
   */
  this.exec_ = null;

  /**
   * Brush size from 1 to 100.
   * @private {number}
   */
  this.brushRadius_ = 0;

  /**
   * Brush colour.
   * @private {!goog.vec.Vec3.Type}
   */
  this.brushColour_ = goog.vec.Vec3.createFloat32(0, 0, 0);
};


/**
 * Width of a preview image.
 * @type {number} @const
 */
shapy.editor.Editor.PREVIEW_WIDTH = 145;


/**
 * Height of a preview image.
 * @type {number} @const
 */
shapy.editor.Editor.PREVIEW_HEIGHT = 100;


/**
 * Takes a snapshot of a scene.
 *
 * @private
 */
shapy.editor.Editor.prototype.snapshot_ = function() {
  var image = new Image();
  image.onload = goog.bind(function() {

    // Resize the image.
    var canvas = document.createElement('canvas');
    canvas.width = shapy.editor.Editor.PREVIEW_WIDTH;
    canvas.height = shapy.editor.Editor.PREVIEW_HEIGHT;
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    // Upload.
    this.scene_.image = canvas.toDataURL('image/jpeg');
    this.http_.post('/api/assets/preview', this.scene_.image, {
        params: {id: this.scene_.id}
    });
  }, this);
  image.src = this.canvas_.toDataURL('image/jpeg');
};


/**
 * Resets the scene after it changes.
 *
 * @param {!shapy.Scene} scene
 * @param {!shapy.User}  user
 */
shapy.editor.Editor.prototype.setScene = function(scene, user) {
  // Clear anything related to the scene.
  this.scene_ = scene;
  this.user = user;
  this.objectGroup_.clear();
  this.partGroup_.clear();
  this.rig(null);

  // Set up the websocket connection.
  this.pending_ = [];
  this.exec_ = new shapy.editor.Executor(this.scene_, this);

  // Attach onFinish emiters.
  this.rigTranslate_.onFinish = goog.bind(this.exec_.emitTranslate, this.exec_);
  this.rigRotate_.onFinish = goog.bind(this.exec_.emitRotate, this.exec_);
  this.rigScale_.onFinish = goog.bind(this.exec_.emitScale, this.exec_);
  this.rigExtrude_.onFinish = goog.bind(this.exec_.emitTranslate, this.exec_);
};


/**
 * Resets the canvas after it changes.
 *
 * @param {!HTMLCanvasElement} canvas
 */
shapy.editor.Editor.prototype.setCanvas = function(canvas) {
  // Set up the renderer.
  this.canvas_ = canvas;
  this.parent_ = goog.dom.getParentElement(this.canvas_);
  this.gl_ = this.canvas_.getContext('webgl', {
      stencil: true,
      antialias: true,
      preserveDrawingBuffer: true
  });
  this.gl_.getExtension('OES_standard_derivatives');
  this.renderer_ = new shapy.editor.Renderer(this.gl_);

  // Initialise the layout.
  this.vp_.width = this.vp_.height = 0;
  this.layout_ = new shapy.editor.Layout.Double();
  this.rig(this.rigTranslate_);

  // Start checkpointing.
  this.checkpoint_ = setInterval(goog.bind(function() {
    console.log('Saved to server.');
    this.snapshot_();
    this.scene_.save();
  }, this), 10000);

  // Watch for changes in the name.
  var name = this.rootScope_.$watch(goog.bind(function() {
    return this.scene_ && this.scene_.name;
  }, this), goog.bind(function(newName, oldName) {
    if (newName == oldName) {
      return;
    }
    if (this.exec_) {
      this.exec_.sendCommand({ type: 'name', value: newName });
    }
  }, this));

  // Watch for changes in the mode.
  var mode = this.rootScope_.$watch(goog.bind(function() {
    return this.mode;
  }, this), goog.bind(function(newMode, oldMode) {
    this.modeChange_();
  }, this), true);

  var onClose = goog.bind(function() {
    name();
    mode();
    location();
  }, this);

  // Watch for changes in location.
  var location = this.rootScope_.$on('$locationChangeStart', function(e) {
    onClose();
  });
};


/**
 * Changes the layout.
 *
 * @param {string} layout Name of the new layout.
 */
shapy.editor.Editor.prototype.setLayout = function(layout) {
  // Clean up after the old layout.
  if (this.layout_) {
    goog.object.forEach(this.layout_.viewports, function(vp) {
      vp.destroy();
    }, this);
  }

  // Change the layout.
  switch (layout) {
    case 'single': this.layout_ = new shapy.editor.Layout.Single(); break;
    case 'double': this.layout_ = new shapy.editor.Layout.Double(); break;
    case 'quad': this.layout_ = new shapy.editor.Layout.Quad(); break;
    default: throw Error('Invalid layout "' + layout + "'");
  }

  // Adjust stuff.
  this.rig(this.rig_);
  this.vp_.width = this.vp_.height = 0;
};


/**
 * Toggles to UV view.
 */
shapy.editor.Editor.prototype.toggleUV = function() {
  this.layout_.toggleUV(this.partGroup);
};


/**
 * Creates a new object, adding it to the scene.
 *
 * @param {string} type Type of the object.
 */
shapy.editor.Editor.prototype.create = function(type) {
  this.exec_.emitCreate(type);
};


/**
 * Called when a frame should be rendered.
 */
shapy.editor.Editor.prototype.render = function() {
  var width = this.parent_.offsetWidth, height = this.parent_.offsetHeight;

  // Resize the canvas if it changes.
  if (this.vp_.width != width || this.vp_.height != height) {
    this.vp_.width = this.canvas_.width = this.parent_.offsetWidth;
    this.vp_.height = this.canvas_.height = this.parent_.offsetHeight;
    this.layout_.resize(width, height);
  }

  // Synchronise meshes & textures.
  goog.object.forEach(this.scene_.textures, function(texture) {
    this.renderer_.updateTexture(texture);
  }, this);
  goog.object.forEach(this.scene_.objects, function(object) {
    this.renderer_.updateObject(object);
  }, this);

  // Clear the screen, render the scenes and then render overlays.
  this.renderer_.start();

  // First pass - compute view/proj matrices and render objects.
  goog.object.forEach(this.layout_.viewports, function(vp, name) {
    switch (vp.type) {
      case shapy.editor.Viewport.Type.EDIT: {
        vp.camera.compute();
        vp.camCube.compute();
        this.renderer_.renderObjects(vp);
        this.renderer_.renderGround(vp);
        this.renderer_.renderCamCube(vp);
        this.renderer_.renderOverlay(vp);
        break;
      }
      case shapy.editor.Viewport.Type.UV: {
        this.renderer_.renderBackground(vp);
        this.renderer_.renderUVMesh(vp);
        this.renderer_.renderOverlay(vp);
        break;
      }
    }
  }, this);

  // Second pass - render rigs.
  if (this.layout_.active &&
      this.layout_.active.rig &&
      this.layout_.active.camera)
  {
    this.renderer_.renderRig(this.layout_.active, this.layout_.active.rig);
  }

  // Queue the next frame.
  this.frame_ = requestAnimationFrame(goog.bind(this.render, this));
};


/**
 * Called when everything should be closed.
 */
shapy.editor.Editor.prototype.destroy = function() {
  // Take a snapshot.
  this.snapshot_();
  this.scene_.save();
  this.scene_.destroy();

  // Stop rendering.
  if (this.frame_) {
    cancelAnimationFrame(this.frame_);
    this.frame_ = null;
  }

  // Cancel checkpointing.
  if (this.checkpoint_) {
    clearInterval(this.checkpoint_);
    this.checkpoint_ = null;
  }

  // Close the websocket connection.
  if (this.exec_) {
    this.exec_.destroy();
    this.exec_ = null;
  }

  // Clean up buffers from camera cubes.
  if (this.layout_) {
    goog.object.forEach(this.layout_.viewports, function(vp) {
      if (!vp.camCube) {
        return;
      }
      vp.camCube.destroy();
    }, this);
    this.layout_ = null;
  }

  // Clean up the renderer.
  if (this.renderer_) {
    this.renderer_.destroy();
    this.renderer_ = null;
  }

  // TODO(Ilija): make these do something actually.
  // Clean up buffers from rigs.
  this.rigTranslate_.destroy();
  this.rigRotate_.destroy();
  this.rigScale_.destroy();
  this.rigCut_.destroy();
  this.rigExtrude_.destroy();
  this.rig_ = null;
};


/**
 * Disselects the currently selected object(s) not allowed by the mode.
 *
 * @private
 */
shapy.editor.Editor.prototype.modeChange_ = function() {
  if (this.mode.object) {
    this.partGroup_.setSelected(null);
    this.partGroup_.clear();
  }
  this.rig(this.rigTranslate_);
};


/**
 * Chooses a rig.
 *
 * @param {!shapy.editor.Rig} rig
 */
shapy.editor.Editor.prototype.rig = function(rig) {
  var attach = this.mode.object ? this.objectGroup_ : this.partGroup_;
  if (attach.isEmpty()) {
    if (this.layout_) {
      this.layout_.active.rig = null;
    }
    this.rig_ = null;
    return;
  }

  this.rig_ = rig;
  if (this.rig_) {
    this.rig_.object = attach;
  }
  if (this.layout_) {
    this.layout_.active.rig = rig;
  }
};

/**
 * Sets a new rig.
 *
 * @param {string} name
 */
shapy.editor.Editor.prototype.setRig = function(name) {
  switch (name) {
    case 'extrude': this.extrude_(); return;
    case 'translate': this.rig(this.rigTranslate_); return;
    case 'rotate': this.rig(this.rigRotate_); return;
    case 'scale': this.rig(this.rigScale_); return;
    case 'cut': this.rig(this.rigCut_); return;
  }
};


/**
 * Extrudes the current selection.
 *
 * @private
 */
shapy.editor.Editor.prototype.extrude_ = function() {
  if (!(object = this.partGroup_.getObject())) {
    return;
  }

  // Get all selected faces.
  faces = this.partGroup_.getFaces();
  if (goog.array.isEmpty(faces)) {
    return;
  }

  // Send a message to the server to extrude.
  this.exec_.emitExtrude(object, this.partGroup_);

  // Extrude.
  var extrudeData = object.extrude(faces);

  // Select extruded faces
  this.partGroup_.clear();
  this.partGroup_.add(extrudeData.faces);
  goog.array.forEach(extrudeData.faces, function(e) {
    e.setSelected(this.user);
  }, this);

  // Set up extrude rig
  this.rig(this.rigExtrude_);
  this.rigExtrude_.setup(extrudeData.normal);
};


/**
 * Handles a key down event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.keyDown = function(e) {
  var object, faces;

  switch (String.fromCharCode(e.keyCode)) {
    case 'D': {
      if (this.mode.object) {
        this.exec_.emitDelete(this.objectGroup_);
        this.objectGroup_.delete();
        this.objectGroup_.clear();
        this.partGroup_.clear();
      } else if (!this.mode.paint) {
        this.exec_.emitDelete(this.partGroup_);
        this.partGroup_.delete();
        this.partGroup_.clear();
      }
      this.rig(null);
      return;
    }
    case 'F': {
      if (!(object = this.partGroup_.getObject())) {
        return;
      }
      verts = this.partGroup_.getVertices();
      if (verts.length != 3 && verts.length != 2) {
        return;
      }
      object.connect(verts);
      return;
    }
    case 'M': {
      if (!(object = this.partGroup_.getObject())) {
        return;
      }
      vert = object.mergeVertices(this.partGroup_.getVertices());
      this.partGroup_.clear();
      this.rig(null);
      return;
    }
    case 'O': {
      if (!this.layout_ || !this.layout_.active) {
        return;
      }
      if (!this.layout_.active.camera) {
        return;
      }
      if (this.layout_.active.camera.constructor == shapy.editor.Camera.Ortho) {
        this.layout_.active.camera = new shapy.editor.Camera.Persp();
      } else {
        this.layout_.active.camera = new shapy.editor.Camera.Ortho();
      }

      this.layout_.resize(this.vp_.width, this.vp_.height);
      break;
    }
    case 'U': {
      // Switch back to normal mode.
      if (this.layout_ &&
          this.layout_.active.type == shapy.editor.Viewport.Type.UV)
      {
        this.layout_.toggleUV(this.partGroup_);
        return;
      }

      // Only one object must be selected.
      if (this.objectGroup_.editables.length != 1) {
        return;
      }
      if (this.layout_ && this.layout_.active) {
        this.layout_.toggleUV(this.partGroup_);
        this.layout_.active.object = this.objectGroup_.editables[0];
        this.layout_.active.object.projectUV();
      }
      break;
    }
    case 'E': this.extrude_(); return;
    case 'T': this.rig(this.rigTranslate_); return;
    case 'R': this.rig(this.rigRotate_); return;
    case 'S': this.rig(this.rigScale_); return;
    case 'C': this.rig(this.rigCut_); return;
    case 'P': this.mode.togglePaint(); return;
    case '1': this.mode.toggleObject(); return;
    case '2': this.mode.toggleFace(); return;
    case '3': this.mode.toggleEdge(); return;
    case '4': this.mode.toggleVertex(); return;
  }

  // Delegate event to viewport.
  if (this.layout_) {
    this.layout_.keyDown(e);
  }
};


/**
 * Sets the colour of the paint brush.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
shapy.editor.Editor.prototype.setBrushColour = function(r, g, b) {
  this.brushColour_[0] = r;
  this.brushColour_[1] = g;
  this.brushColour_[2] = b;
};


/**
 * Sets the size of the brush.
 *
 * @param {number} radius
 */
shapy.editor.Editor.prototype.setBrushRadius = function(radius) {
  this.brushRadius_ = radius;
};


/**
 * Handles a mouse button release event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseUp = function(e) {
  var ray, toSelect, toDeselect, group;
  var selectUV = this.layout_.active.type == shapy.editor.Viewport.Type.UV;

  // TOOD: do it nicer.
  // If viewports want the event, give up.
  if ((!(ray = this.layout_.mouseUp(e)) && !selectUV) ||
      e.which != 1 ||
      this.mode.paint)
  {
    return;
  }

  // If nothing selected, ignore event.
  if (!this.hover_ || goog.array.isEmpty(this.hover_)) {
    return;
  }

  // Find out which group is going to be affected.
  if (this.mode.object) {
    group = this.objectGroup_;
  } else if (!this.mode.paint) {
    group = this.partGroup_;
  } else {
    return;
  }

  // Find out what is going to be selected & what is going to be selected.
  if (e.ctrlKey) {
    toDeselect = [];
    toSelect = goog.array.filter(this.hover_, function(e) {
      return !group.contains(e);
    }, this);
  } else if (e.shiftKey) {
    toSelect = [];
    toDeselect = goog.array.filter(this.hover_, function(e) {
      return group.contains(e);
    }, this);
  } else {
    toSelect = goog.array.filter(this.hover_, function(e) {
      return !group.contains(e);
    }, this);
    toDeselect = goog.array.filter(group.editables, function(e) {
      return !goog.array.contains(this.hover_, e);
    }, this);
  }

  // Send a command to the server to lock on objects or adjust part group.
  if (this.mode.object) {
    this.exec_.emitSelect(toSelect, toDeselect);
  } else if (!this.mode.paint) {
    // Adjust highlight.
    goog.array.forEach(toDeselect, function(e) {
      e.setSelected(null);
    }, this);
    goog.array.forEach(toSelect, function(e) {
      e.setSelected(this.user);
    }, this);

    group.remove(toDeselect);
    group.add(toSelect);
  }
};


/**
 * Handles mouse motion events.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseMove = function(e) {
  var pick, hits = [], hit, ray, frustum, uv, object, texture, isUV;
  var group = this.layout_.hover && this.layout_.hover.group;

  // Find the entity under the mouse.
  ray = this.layout_.mouseMove(e, this.mode.paint, this.mode.paint);
  if (!this.layout_.hover) {
    return;
  }

  if (!(isUV = this.layout_.hover.type == shapy.editor.Viewport.Type.UV)) {
    if (!!ray) {
      hit = this.scene_.pickRay(ray, this.mode);
      hits = hit ? [hit] : [];
    } else if (group && group.width > 3 && group.height > 3) {
      frustum = this.layout_.hover.groupcast(group);
      hits = this.scene_.pickFrustum(frustum, this.mode);
    }
  } else {
    if (group && group.width > 10 && group.height > 10 && !this.mode.paint) {
      hits = this.layout_.hover.object.pickUVGroup(
          this.layout_.hover.groupcast(group), this.mode);
    } else {
      hits = this.layout_.hover.object.pickUVCoord(
          this.layout_.hover.raycast(e.offsetX, e.offsetY), this.mode);
      if (hits.length > 1) {
        hits = [hits[hits.length - 1]];
      }
    }
  }

  // Filter out all parts that do not belong to the current object.
  if (this.mode.object) {
    pick = hits;
  } else {
    if (this.mode.paint) {
      if (!isUV && !goog.array.isEmpty(hits) && e.which == 1) {
        uv = hits[0].pickUV(ray);
        object = hits[0].object;
      } else if (isUV && e.which == 1) {
        uv = this.layout_.hover.raycast(e.offsetX, e.offsetY);
        object = this.layout_.hover.object;
      } else {
        uv = null;
        object = null;
      }

      if (uv && object && (texture = this.scene_.textures[object.texture])) {
        texture.paint(uv.u, uv.v, this.brushColour_, this.brushRadius_);
        pick = [];
      }
    }
    pick = goog.array.filter(hits, function(e) {
      return this.objectGroup_.contains(e.object);
    }, this);
  }

  // Highlight the current object.
  goog.array.forEach(this.hover_, function(e) {
    e.setHover(false);
  });
  this.hover_ = pick;
  goog.array.forEach(this.hover_, function(e) {
    e.setHover(true);
  });
};


/**
 * Handles a mouse button press event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseDown = function(e) {
  this.layout_.mouseDown(e);
};


/**
 * Handles a mouse enter event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseEnter = function(e) {
  this.layout_.mouseEnter(e);
};


/**
 * Handles a mouse leave event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseLeave = function(e) {
  this.layout_.mouseLeave(e);
};


/**
 * Handles the mouse wheel motion.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseWheel = function(e) {
  this.layout_.mouseWheel(e);
};

