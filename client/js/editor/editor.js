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

  // Watch for changes in the name.
  $rootScope.$watch(goog.bind(function() {
    return this.scene_ && this.scene_.name;
  }, this), goog.bind(function(newName, oldName) {
    if (newName == oldName) {
      return;
    }
    this.sendCommand({ type: 'name', value: newName });
  }, this));
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
  this.layout_ = new shapy.editor.Layout.Single();
  //this.scene_.createSphere(0.5, 16, 16);
  this.select(goog.object.getAnyValue(this.scene_.objects));
  this.rig(this.rigTranslate_);
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
    case 'quad': this.layout_ = new shapy.editor.Layout.Quad(); break;
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

  // Synchronise meshes
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
    this.renderer_.renderBorder(vp);
    this.renderer_.renderCamCube(vp);
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
 * Selects an object.
 *
 * @param {!shapy.editor.Editable} object
 */
shapy.editor.Editor.prototype.select = function(object) {
  if (!object) {
    this.selected_ = null;
    this.rig(null);
    return;
  }

  // Cut rig should not be attached to anything other than objects.
  if (this.rig_ && this.rig_.type == shapy.editor.Rig.Type.CUT &&
      object.type != shapy.editor.Editable.Type.OBJECT) {
    return;
  }

  this.selected_ = object;
  if (this.rig_) {
    this.rig_.object = object;
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
  //if (rig.type == shapy.editor.Rig.Type.CUT &&
  //    this.selected_.type != shapy.editor.Editable.Type.OBJECT) {
  //  return;
  //}

  this.rig_ = rig;
  this.rig_.object = this.selected_;
  if (this.layout_) {
    this.layout_.active.rig = rig;
  }
};


/**
 * Handles a key press.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.keyDown = function(e) {
  switch (e.keyCode) {
    case 67: this.rig(this.rigCut_);       break;
    case 82: this.rig(this.rigRotate_);    break;
    case 83: this.rig(this.rigScale_);     break;
    case 84: this.rig(this.rigTranslate_); break;
    default: {
      if (this.layout_ && this.layout_.active) {
        this.layout_.active.keyDown(e.keyCode);
      }
      break;
    }
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
  var ray, pick;

  // If viewports want the event, give up.
  if (!(ray = this.layout_.mouseUp(e)) || e.which != 1) {
    return;
  }

  if (pick = this.scene_.pick(ray)) {
    this.select(pick);
  }
};


/**
 * Handles mouse motion events.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseMove = function(e) {
  var pick, ray;

  if (!(ray = this.layout_.mouseMove(e))) {
    return;
  }
  if (!(pick = this.scene_.pick(ray))) {
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
