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
goog.require('shapy.editor.Layout');
goog.require('shapy.editor.Layout.Double');
goog.require('shapy.editor.Layout.Quad');
goog.require('shapy.editor.Layout.Single');
goog.require('shapy.editor.Mode');
goog.require('shapy.editor.Renderer');
goog.require('shapy.editor.Rig');
goog.require('shapy.editor.Rig.Cut');
goog.require('shapy.editor.Rig.Rotate');
goog.require('shapy.editor.Rig.Scale');
goog.require('shapy.editor.Rig.Translate');
goog.require('shapy.editor.Viewport');



/**
 * Minor editor controller.
 *
 * @constructor
 *
 * @param {!shapy.Scene}         scene
 * @param {!shapy.editor.Editor} shEditor
 */
shapy.editor.EditorController = function(scene, shEditor) {
  /** @private {!shapy.Scene} @const */
  this.scene_ = scene;
  /** @private {!shapy.editor.Editor} @const */
  this.shEditor_ = shEditor;

  // Initialise the scene.
  this.shEditor_.setScene(this.scene_);
};



/**
 * Editor service exposing all editor functionality.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$location} $location Angular location service.
 * @param {!angular.$scope}    $rootScope
 */
shapy.editor.Editor = function($location, $rootScope) {
  /** @private {!shapy.editor.Rig} @const */
  this.rigTranslate_ = new shapy.editor.Rig.Translate();
  /** @private {!shapy.editor.Rig} @const */
  this.rigRotate_ = new shapy.editor.Rig.Rotate();
  /** @private {!shapy.editor.Rig} @const */
  this.rigScale_ = new shapy.editor.Rig.Scale();
  /** @private {!shapy.editor.Rig} @const */
  this.rigCut_ = new shapy.editor.Rig.Cut();

  /** @private {!angular.$location} @const */
  this.location_ = $location;
  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;

  /**
   * Is the ctrl modifier key pressed?
   * @private {boolean}
   */
  this.ctrlDown_ = false;

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
   * Current scene.
   * @private {!shapy.Scene}
   */
  this.scene_ = null;

  /**
   * Name of the scene.
   * @private {string}
   */
  this.name_ = '';

  /**
   * WebSocket connection.
   * @private {WebSocket}
   */
  this.sock_ = null;

  /**
   * Pending requests.
   * @private {!Array<Object>}
   */
  this.pending_ = [];

  /**
   * Renderer that manages all WebGL resources.
   * @private {shapy.editor.Renderer}
   */
  this.renderer_ = null;

  /**
   * Currently selected object
   * @private {shapy.editor.Editable}
   */
  this.selected_ = null;

  /**
   * Object hovered by mouse.
   * @private {!shapy.editor.Editable}
   */
  this.hover_ = null;

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
   * Size of the canvas.
   * @private {!goog.math.Size} @const
   */
  this.vp_ = new goog.math.Size(0, 0);

  /**
   * Edit mode.
   * @public {!shapy.editor.Mode} @const
   */
  this.mode = new shapy.editor.Mode();

  // Watch for changes in the name.
  $rootScope.$watch(goog.bind(function() {
    return this.scene_ && this.scene_.name;
  }, this), goog.bind(function(newName, oldName) {
    if (newName == oldName) {
      return;
    }
    this.sendCommand({ type: 'name', value: newName });
  }, this));

  // Watch for changes in the mode.
  this.rootScope_.$watch(goog.bind(function() {
    return this.mode;
  }, this), goog.bind(function(newMode, oldMode) {
    this.modeChange_();
  }, this), true);
};


/**
 * Resets the scene after it changes.
 *
 * @param {!shapy.Scene} scene
 */
shapy.editor.Editor.prototype.setScene = function(scene) {
  // Clear anything related to the scene.
  this.scene_ = scene;
  this.selected_ = null;
  this.rig(null);

  // Set up the websocket connectio.
  this.pending_ = [];
  this.sock_ = new WebSocket(goog.string.format('ws://%s:%d/api/edit/%s',
      this.location_.host(), this.location_.port(), this.scene_.id));
  this.sock_.onmessage = goog.bind(this.onMessage_, this);
  this.sock_.onclose = goog.bind(this.onClose_, this);
  this.sock_.onopen = goog.bind(this.onOpen_, this);
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
      antialias: true
  });
  this.gl_.getExtension('OES_standard_derivatives');
  this.renderer_ = new shapy.editor.Renderer(this.gl_);

  // Initialise the layout.
  this.vp_.width = this.vp_.height = 0;
  //this.layout_ = new shapy.editor.Layout.Double();
  //this.scene_.createSphere(0.5, 16, 16);
  this.layout_ = new shapy.editor.Layout.Single();
  //this.select(goog.object.getAnyValue(this.scene_.objects));
  //this.rig(this.rigTranslate_);
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
      vp.camCube.destroy();
    }, this);
  }

  // Change the layout.
  switch (layout) {
    case 'single': this.layout_ = new shapy.editor.Layout.Single(); break;
    case 'double': this.layout_ = new shapy.editor.Layout.Double(); break;
    case 'quad':   this.layout_ = new shapy.editor.Layout.Quad();   break;
    default: throw Error('Invalid layout "' + layout + "'");
  }

  // Adjust stuff.
  this.select(this.selected_);
  this.rig(this.rig_);
  this.vp_.width = this.vp_.height = 0;
};


/**
 * Creates a new object, adding it to the scene.
 *
 * @param {string} type Type of the object.
 */
shapy.editor.Editor.prototype.create = function(type) {
  var id, object;

  switch (type) {
    case 'cube': {
      this.select(this.scene_.createCube(0.5, 0.5, 0.5));
      break;
    }
    case 'sphere': {
      this.select(this.scene_.createSphere(0.5, 16, 16));
      break;
    }
    default: throw new Error('Invalid object type "' + type + "'");
  }
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

  // Synchronise meshes.
  goog.object.forEach(this.scene_.objects, function(object, name, objects) {
    object.computeModel();
    if (object.dirtyMesh) {
      this.renderer_.updateObject(object);
      object.dirtyMesh = false;
    }
  }, this);

  // Clear the screen, render the scenes and then render overlays.
  this.renderer_.start();

  // First pass - compute view/proj matrices and render objects.
  goog.object.forEach(this.layout_.viewports, function(vp, name) {
    vp.camera.compute();
    vp.camCube.compute();
    this.renderer_.renderObjects(vp);
    this.renderer_.renderGround(vp);
    this.renderer_.renderCamCube(vp);
    this.renderer_.renderOverlay(vp);
  }, this);

  // Second pass - render rigs.
  if (this.layout_.active && this.layout_.active.rig) {
    this.renderer_.renderRig(this.layout_.active, this.layout_.active.rig);
  }

  // Queue the next frame.
  this.frame_ = requestAnimationFrame(goog.bind(this.render, this));
};


/**
 * Called when everything should be closed.
 */
shapy.editor.Editor.prototype.destroy = function() {
  // Stop rendering.
  if (this.frame_) {
    cancelAnimationFrame(this.frame_);
    this.frame_ = null;
  }

  // Close the websocket connection.
  if (this.sock_) {
    this.sock_.close();
    this.sock_ = null;
  }

  // Clean up buffers from camera cubes.
  if (this.layout_) {
    goog.object.forEach(this.layout_.viewports, function(vp) {
      vp.camCube.destroy();
    }, this);
    this.layout_ = null;
  }

  // Clean up the renderer.
  if (this.renderer_) {
    this.renderer_.destroy();
    this.renderer_ = null;
  }

  // Clean up buffers from rigs.
  this.rigTranslate_.destroy();
  this.rigRotate_.destroy();
  this.rigScale_.destroy();
  this.rigCut_.destroy();
  this.rig_ = null;
};


/**
 * Called on the receipt of a message from the server.
 *
 * @private
 *
 * @param {MessageEvent} evt
 */
shapy.editor.Editor.prototype.onMessage_ = function(evt) {
  var data;

  // Try to make sense of the data.
  try {
    data = JSON.parse(evt.data);
  } catch (e) {
    console.error('Invalid message: ' + evt.data);
  }

  this.rootScope_.$apply(goog.bind(function() {
    switch (data['type']) {
      case 'name': {
        if (this.scene_.name != data['value']) {
          this.scene_.name = data['value'];
        }
        break;
      }
      case 'join': {
        this.scene_.addUser(data['user']);
        break;
      }
      case 'meta': {
        this.scene_.name = data['name'];
        this.scene_.setUsers(data['users']);
        break;
      }
      case 'leave': {
        this.scene_.removeUser(data['user']);
        break;
      }
      case 'edit': {
        switch (data['tool']) {
          case 'translate': {
            this.scene_.objects[data['id']].translate(
                data['x'], data['y'], data['z']);
            break;
          }
          default: {
            console.error('Invalid tool "' + data['tool'] + "'");
            break;
          }
        }
        break;
      }
      default: {
        console.error('Invalid message type "' + data['type'] + '"');
        break;
      }
    }
  }, this));
};


/**
 * Called when the connection opens - flushes pending requests.
 *
 * @private
 */
shapy.editor.Editor.prototype.onOpen_ = function() {
  goog.array.map(this.pending_, function(message) {
    this.sock_.send(JSON.stringify(message));
  }, this);
};


/**
 * Called when the server suspends the connection.
 *
 * @private
 *
 * @param {CloseEvent} evt
 */
shapy.editor.Editor.prototype.onClose_ = function(evt) {
};


/**
 * Disselects the currently selected object(s) not allowed by the mode.
 *
 * @private
 */
shapy.editor.Editor.prototype.modeChange_ = function() {
  // Makes sure the object is not disselected when switching from object
  // mode to face/edge/vertex mode in order to allow for group selection.
  if (this.selected_ && !this.mode[this.selected_.type] &&
      this.selected_.type != shapy.editor.Editable.Type.OBJECT) {
    this.selected_.setSelected(false);
    this.selected_ = null;
    this.rig(null);
  }
};


/**
 * Adds an editable to a selection group.
 * 
 * @private
 *
 * @param {!shapy.editor.Editable} editable
 */
shapy.editor.Editor.prototype.addToSelGroup_ = function(editable) {
  // Removing from the group.
  if (editable.selected) {
    this.selected_.remove(editable);

    // Editable was the last member of the group.
    if (this.selected_.isEmpty()) {
      this.selected_ = null;
      this.rig(null);
    }
    return;   
  }

  // Adding.
  var group;
  // The group already exists.
  if (this.selected_.type == shapy.editor.Editable.Type.OBJECT_GROUP ||
      this.selected_.type == shapy.editor.Editable.Type.PARTS_GROUP) {
    group = this.selected_;
  } else {
    // Start a new group.
    if (this.selected_.type == shapy.editor.Editable.Type.OBJECT) {
      group = new shapy.editor.ObjectGroup([this.selected_]);
    } else {
      group = new shapy.editor.PartsGroup([this.selected_]);
    }
    
    group.setSelected(true);
    this.selected_ = group;

    if (this.rig_) {
      this.rig_.object = group;
    }
  }
    
  // Add to the group.
  group.add(editable);
};


/**
 * Selects an editable.
 *
 * @param {!shapy.editor.Editable} editable
 */
shapy.editor.Editor.prototype.select = function(editable) {
  // Disselecting/ deleting.
  if (!editable) {
    this.selected_ = null;
    this.rig(null);
    return;
  }

  if (this.selected_) {
    // Trying to select the same object has no effect.
    if (this.selected_ == editable) {
      return;
    }

    // Selection group.
    if (this.ctrlDown_) {
      this.addToSelGroup_(editable);
      return;
    }

    this.selected_.setSelected(false);
  }

  editable.setSelected(true);
  this.selected_ = editable;

  if (this.rig_) {
    this.rig_.object = editable;
  }
};


/**
 * Chooses a rig.
 *
 * @param {!shapy.editor.Rig} rig
 */
shapy.editor.Editor.prototype.rig = function(rig) {
  if (!this.selected_) {
    if (this.layout_) {
      this.layout_.active.rig = null;
    }
    this.rig_ = null;
    return;
  }

  // Cut rig should not be attached to anything other than objects.
  //if (this.rig_ && this.rig_.type == shapy.editor.Rig.Type.CUT &&
  //    object.type != shapy.editor.Editable.Type.OBJECT) {
  //  return;
  //}

  // Cut rig should not be attached to anything other than objects.
  //if (rig.type == shapy.editor.Rig.Type.CUT &&
  //    this.selected_.type != shapy.editor.Editable.Type.OBJECT) {
  //  return;
  //}

  //if (this.rig_ && this.rig_.type == shapy.editor.Rig.Type.CUT) {
  //  this.rig_.reset();
  //}

  this.rig_ = rig;
  this.rig_.object = this.selected_;
  if (this.layout_) {
    this.layout_.active.rig = rig;
  }
};


/**
 * Handles a key down event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.keyDown = function(e) {
  var object;

  switch (e.keyCode) {
    case 17: this.ctrlDown_ = true; break;        // control
    case 68: {                                    // d
      if (this.selected_) {
        this.selected_.delete();
        this.select(null);
        this.rig(null);
        break;
      }
    }
    case 70: {
      if (!this.selected_ || !(object = this.selected_.getObject())) {
        return;
      }
      var verts = this.selected_.getVertices();
      if (verts.length != 3 && verts.length != 2) {
        return;
      }
      object.connect(verts);
      break;
    }
    case 77: {
      if (!this.selected_ || !(object = this.selected_.getObject())) {
        return;
      }
      object.mergeVertices(this.selected_.getVertices());
      this.select(null);
      this.rig(null);
      break;
    }
    case 84: this.rig(this.rigTranslate_); break; // t
    case 82: this.rig(this.rigRotate_); break;    // r
    case 83: this.rig(this.rigScale_); break;     // s
    case 67: this.rig(this.rigCut_); break;       // c
    default: {
      if (this.layout_ && this.layout_.active) {
        this.layout_.active.keyDown(e.keyCode);
      }
      break;
    }
  }
};


/**
 * Handles a key up event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.keyUp = function(e) {
  switch (e.keyCode) {
    case 17: this.ctrlDown_ = false; break;        // control
    default:
      break;
  }
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
 * Handles a mouse button release event.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseUp = function(e) {
  var ray, pick, group = this.layout_.active.group;

  // If viewports want the event, give up.
  if (!(ray = this.layout_.mouseUp(e)) || e.which != 1) {
    return;
  }

  if (group && group.width > 3 && group.height > 3) {
    var frustum = this.layout_.active.groupcast(group);
    if (pick = this.scene_.pickFrustum(frustum, this.selected_, this.mode)) {
      this.select(pick);
    }
  } else {
    if (pick = this.scene_.pickRay(ray, this.mode)) {
      this.select(pick);
    }
  }
};


/**
 * Handles mouse motion events.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseMove = function(e) {
  var pick, ray, group = this.layout_.active.group;

  if (!(ray = this.layout_.mouseMove(e))) {
    if (group) {
      pick = this.scene_.pickFrustum(
          this.layout_.active.groupcast(group), this.selected_, this.mode);
    }
    if (!pick) {
      if (this.hover_) {
        this.hover_.setHover(false);
      }
      return;
    }
  } else {
    pick = this.scene_.pickRay(ray, this.mode);
  }
  if (!pick && this.hover_) {
    this.hover_.setHover(false);
    return;
  }

  if (pick != this.hover_) {
    if (this.hover_) {
      this.hover_.setHover(false);
    }
    pick.setHover(true);
    this.hover_ = pick;
  }
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
  if (this.layout_ && this.layout_.hover) {
    this.layout_.hover.mouseWheel(e.originalEvent.wheelDelta);
  }
};


/**
 * Sends a command over websockets.
 *
 * @param {Object} data
 */
shapy.editor.Editor.prototype.sendCommand = function(data) {
  if (!this.sock_ || this.sock_.readyState != 1) {
    this.pending_.push(data);
    return;
  }
  this.sock_.send(JSON.stringify(data));
};
