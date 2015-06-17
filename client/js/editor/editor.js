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
goog.require('shapy.browser.Texture');
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
 * @param {!angular.$scope}      $scope
 * @param {!shapy.User}          user
 * @param {!shapy.Scene}         scene
 * @param {!shapy.editor.Editor} shEditor
 */
shapy.editor.EditorController = function($scope, user, scene, shEditor) {
  /** @private {!shapy.Scene} @const */
  this.scene_ = scene;
  /** @private {!shapy.editor.Editor} @const */
  this.shEditor_ = shEditor;
  /** @public {!shapy.User} @const */
  this.user = user;
  /** @public {string} */
  this.message = '';
  /** @public {!Array<Object>} */
  this.messageList = this.shEditor_.messageList;

  // Initialise the scene.
  this.shEditor_.setScene(this.scene_, this.user);
};


/**
 * Sends a message to all other people in the chat room.
 *
 * @param {string} msg
 */
shapy.editor.EditorController.prototype.sendMessage = function(msg) {
  this.shEditor_.sendMessage(msg);
  this.message = '';
};


/**
 * Editor service exposing all editor functionality.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http}              $http      The Angular HTTP service.
 * @param {!angular.$location}          $location  The Angular location service.
 * @param {!angular.$scope}             $rootScope
 * @param {!shapy.UserService}          shUser
 * @param {!shapy.browser.Service}      shBrowser
 * @param {!shapy.notification.Service} shNotify
 */
shapy.editor.Editor = function(
    $http,
    $location,
    $rootScope,
    shUser,
    shBrowser,
    shNotify)
{
  /** @private {!angular.$location} @const */
  this.location_ = $location;
  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!shapy.UserService} @const */
  this.shUser_ = shUser;
  /** @private {!shapy.browser.Service} @const */
  this.shBrowser_ = shBrowser;
  /** @private {!shapy.notification.Service} @const */
  this.shNotify_ = shNotify;

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

  /**
   * Messages stored as a pair joining a user name to a list of messages
   */
  this.messageList = [];

  /**
   * Unread messages
   */
  this.unreadMessages = 0;

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
   * @public {shapy.editor.ObjectGroup}
   */
  this.objectGroup = new shapy.editor.ObjectGroup();

  /**
   * Currently selected group of parts.
   * @public {shapy.editor.PartsGroup}
   */
  this.partGroup = new shapy.editor.PartsGroup();

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
   * @public {!shapy.editor.Layout}
   */
  this.layout = null;

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

  /**
   * Cached textures.
   * @private {Object}
   */
  this.textures_ = {};
};


/**
 * Sends a message.
 *
 * @param {string} msg
 */
shapy.editor.Editor.prototype.sendMessage = function(msg) {
  this.exec_.emitMessage(msg);
};


/**
 * Takes a snapshot of a scene.
 *
 * @private
 */
shapy.editor.Editor.prototype.snapshot_ = function() {
  if (!this.scene_.write) {
    return;
  }

  this.shNotify_.notice({
    dismiss: 1500,
    text: 'Saving asset...'
  });

  // Save all textures.
  goog.object.forEach(this.textures_, function(texture) {
    texture.save();
  });

  // Generate & save the preview.
  this.scene_.image = shapy.browser.Texture.preview(
    this.canvas_
  ).toDataURL('image/jpeg');

  // Save the scene.
  this.scene_.save();
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
  this.objectGroup.clear();
  this.partGroup.clear();
  this.rig(null);

  // Set up the websocket connection.
  this.pending_ = [];

  // Create the executor based on the write permission.
  if (this.scene_.write) {
    this.exec_ = new shapy.editor.WriteExecutor(this.scene_, this);

    // Attach onFinish emiters.
    this.rigTranslate_.onFinish = goog.bind(
        this.exec_.emitTranslate, this.exec_);
    this.rigRotate_.onFinish = goog.bind(this.exec_.emitRotate, this.exec_);
    this.rigScale_.onFinish = goog.bind(this.exec_.emitScale, this.exec_);
    this.rigExtrude_.onFinish = goog.bind(this.exec_.emitTranslate, this.exec_);
  } else {
    this.shNotify_.warning({
      text: 'This scene is read-only.',
      dismiss: 5000
    });
    this.exec_ = new shapy.editor.ReadExecutor(this.scene_, this);
  }

  // Load all textures.
  goog.object.forEach(this.scene_.objects, function(object) {
    if (!object.texture) {
      return;
    }
    this.shBrowser_.getTexture(object.texture)
      .then(goog.bind(function(texture) {
        this.textures_[object.texture] = texture;
      }, this));
  }, this);
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
  this.layout = new shapy.editor.Layout.Single(this);
  this.rig(this.rigTranslate_);

  // Start checkpointing.
  this.checkpoint_ = setInterval(goog.bind(function() {
    this.snapshot_();
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
  if (this.layout) {
    goog.object.forEach(this.layout.viewports, function(vp) {
      vp.destroy();
    }, this);
  }

  // Change the layout.
  switch (layout) {
    case 'single': this.layout = new shapy.editor.Layout.Single(this); break;
    case 'double': this.layout = new shapy.editor.Layout.Double(this); break;
    case 'quad': this.layout = new shapy.editor.Layout.Quad(this); break;
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
  this.layout.toggleUV(this.partGroup);
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
 * Applies a texture to the currently selected objects.
 *
 * @param {number}                    id ID of the texture to apply.
 * @param {shapy.editor.Editable} object Object the texture is to be applied to.
 */
shapy.editor.Editor.prototype.applyTexture = function(id, object) {
  this.shBrowser_.getTexture(id).then(goog.bind(function(texture) {
    object.texture = id;
    this.textures_[id] = texture;
  }, this));
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
    this.layout.resize(width, height);
  }

  // Synchronise meshes & textures.
  goog.object.forEach(this.scene_.objects, function(object) {
    this.renderer_.updateObject(object);
    if (object.texture && this.textures_[object.texture]) {
      this.renderer_.updateTexture(this.textures_[object.texture]);
    }
  }, this);

  // Clear the screen, render the scenes and then render overlays.
  this.renderer_.start();

  // First pass - compute view/proj matrices and render objects.
  goog.object.forEach(this.layout.viewports, function(vp, name) {
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
  if (this.layout.active &&
      this.layout.active.rig &&
      this.layout.active.camera)
  {
    this.renderer_.renderRig(this.layout.active, this.layout.active.rig);
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
  if (this.layout) {
    goog.object.forEach(this.layout.viewports, function(vp) {
      if (!vp.camCube) {
        return;
      }
      vp.camCube.destroy();
    }, this);
    this.layout = null;
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
    this.partGroup.setSelected(null);
    this.partGroup.clear();
  } else {
    // Deselect parts no longer allowed.
    this.partGroup.editables = goog.array.filter(
        this.partGroup.editables, function(e) {
          var allowed = this.mode[e.type];
          if (!allowed) {
            e.setSelected(null);
          }
          return allowed;
        }, this);
  }
  this.rig(this.rigTranslate_);
};


/**
 * Chooses a rig.
 *
 * @param {!shapy.editor.Rig} rig
 */
shapy.editor.Editor.prototype.rig = function(rig) {
  var attach = this.mode.object ? this.objectGroup : this.partGroup;
  if (attach.isEmpty()) {
    if (this.layout) {
      this.layout.active.rig = null;
    }
    this.rig_ = null;
    return;
  }

  this.rig_ = rig;
  if (this.rig_) {
    this.rig_.object = attach;
  }
  if (this.layout) {
    this.layout.active.rig = rig;
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
  if (!(object = this.partGroup.getObject())) {
    return;
  }

  // Get all selected faces.
  faces = this.partGroup.getFaces();
  if (goog.array.isEmpty(faces)) {
    return;
  }

  // Send a message to the server to extrude.
  this.exec_.emitExtrude(object, this.partGroup);

  // Extrude.
  var extrudeData = object.extrude(faces);

  // Select extruded faces
  this.partGroup.clear();
  this.partGroup.add(extrudeData.faces);
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
  var object, faces, uvs;

  switch (String.fromCharCode(e.keyCode)) {
    case 'D': {
      if (this.mode.object) {
        this.exec_.emitDelete(this.objectGroup);
        this.objectGroup.delete();
        this.objectGroup.clear();
        this.partGroup.clear();
        this.layout.closeUV();
      } else if (!this.mode.paint) {
        this.exec_.emitDelete(this.partGroup);
        this.partGroup.delete();
        this.partGroup.clear();
      }
      this.rig(null);
      return;
    }
    case 'F': {
      if (!(object = this.partGroup.getObject())) {
        return;
      }
      verts = this.partGroup.getVertices();
      if (verts.length != 3 && verts.length != 2) {
        return;
      }
      this.exec_.emitConnect(object, this.partGroup);
      object.connect(verts);
      return;
    }
    case 'W': {
      if (!(object = this.partGroup.getObject())) {
        return;
      }
      uvs = this.partGroup.getUVPoints();
      object.weld(uvs);
      this.partGroup.clear();
      return
    }
    case 'M': {
      if (!(object = this.partGroup.getObject())) {
        return;
      }
      this.exec_.emitMerge(object, this.partGroup);
      object.mergeVertices(this.partGroup.getVertices());
      this.partGroup.clear();
      this.rig(null);
      return;
    }
    case 'O': {
      if (!this.layout || !this.layout.active) {
        return;
      }
      if (!this.layout.active.camera) {
        return;
      }
      if (this.layout.active.camera.constructor == shapy.editor.Camera.Ortho) {
        this.layout.active.camera = new shapy.editor.Camera.Persp();
      } else {
        this.layout.active.camera = new shapy.editor.Camera.Ortho();
      }

      this.layout.resize(this.vp_.width, this.vp_.height);
      break;
    }
    case 'U': {
      // Switch back to normal mode.
      if (this.layout &&
          this.layout.active.type == shapy.editor.Viewport.Type.UV)
      {
        this.layout.toggleUV(this.partGroup);
        return;
      }

      // Only one object must be selected.
      if (this.objectGroup.editables.length != 1) {
        return;
      }
      if (this.layout && this.layout.active) {
        this.layout.toggleUV(this.partGroup);
        this.layout.active.object = this.objectGroup.editables[0];
        this.layout.active.object.projectUV();
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
  if (this.layout) {
    this.layout.keyDown(e);
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
  var selectUV = this.layout.active.type == shapy.editor.Viewport.Type.UV;

  // TOOD: do it nicer.
  // If viewports want the event, give up.
  if ((!(ray = this.layout.mouseUp(e)) && !selectUV) ||
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
    group = this.objectGroup;
  } else if (!this.mode.paint) {
    group = this.partGroup;
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
  // Retrieve highlighted objects from viewports.
  var pick = this.layout.mouseMove(e);

  // Highlight selection.
  goog.array.forEach(this.hover_, function(e) {
    e.setHover(false);
  });
  this.hover_ = this.mode.object ? pick : goog.array.filter(pick, function(e) {
    return this.objectGroup.contains(e.object);
  }, this);
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
  this.layout.mouseDown(e);
};


/**
 * Handles a mouse enter event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseEnter = function(e) {
  this.layout.mouseEnter(e);
};


/**
 * Handles a mouse leave event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseLeave = function(e) {
  this.layout.mouseLeave(e);
};


/**
 * Handles the mouse wheel motion.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseWheel = function(e) {
  this.layout.mouseWheel(e);
};
