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

  /**
   * WebSocket command executor.
   * @private {!shapy.editor.Executor}
   */
  this.exec_ = null;

  // Watch for changes in the name.
  $rootScope.$watch(goog.bind(function() {
    return this.scene_ && this.scene_.name;
  }, this), goog.bind(function(newName, oldName) {
    if (newName == oldName) {
      return;
    }
    this.exec_.sendCommand({ type: 'name', value: newName });
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
  this.objectGroup_.clear();
  this.partGroup_.clear();
  this.rig(null);

  // Set up the websocket connectio.
  this.pending_ = [];
  this.exec_ = new shapy.editor.Executor(this.scene_, this);
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
    case 'quad':   this.layout_ = new shapy.editor.Layout.Quad();   break;
    default: throw Error('Invalid layout "' + layout + "'");
  }

  // Adjust stuff.
  this.rig(this.rig_);
  this.vp_.width = this.vp_.height = 0;
};


/**
 * Creates a new object, adding it to the scene.
 *
 * @param {string} type Type of the object.
 */
shapy.editor.Editor.prototype.create = function(type) {
  this.mode.setObject();
  this.exec_.sendCommand({
    type: 'create',
    object: type
  });
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
  if (this.exec_) {
    this.exec_.destroy();
    this.exec_ = null;
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
 * Disselects the currently selected object(s) not allowed by the mode.
 *
 * @private
 */
shapy.editor.Editor.prototype.modeChange_ = function() {
  this.partGroup_.setSelected(false);
  this.objectGroup_.setSelected(false);

  if (this.mode.object) {
    this.partGroup_.clear();
    this.rig(this.rigTranslate_);
  } else {
    var object = this.objectGroup_.getLast();
    this.objectGroup_.clear();
    this.objectGroup_.add(object);
    this.rig(this.rigTranslate_);
  }

  this.partGroup_.setSelected(true);
  this.objectGroup_.setSelected(true);
};


/**
 * Selects an editable.
 *
 * @param {!shapy.editor.Editable} editable
 * @param {boolean}                groupSelect
 */
shapy.editor.Editor.prototype.select = function(editable, groupSelect) {
  var group, selected = editable ? editable.isSelected() : false;

  this.partGroup_.setSelected(false);
  this.objectGroup_.setSelected(false);

  if (this.mode.object) {
    if (!groupSelect) {
      this.objectGroup_.clear();
    }
    group = this.objectGroup_;
  } else {
    if (!groupSelect) {
      this.partGroup_.clear();
    }
    group = this.partGroup_;
  }

  if (editable) {
    if (selected) {
      group.remove(editable);
    } else {
      group.add(editable);
    }
  } else {
    group.clear();
  }

  this.partGroup_.setSelected(true);
  this.objectGroup_.setSelected(true);
  this.rig(this.rig_ || this.rigTranslate_);
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
    if (this.layout_) {
      this.layout_.active.rig = rig;
    }
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
    case 68: {                                    // d
      if (this.partGroup_) {
        this.partGroup_.delete();
        this.select(null);
        this.rig(null);
        break;
      }
    }
    case 70: {
      if (!this.partGroup_ || !(object = this.partGroup_.getObject())) {
        return;
      }
      var verts = this.partGroup_.getVertices();
      if (verts.length != 3 && verts.length != 2) {
        return;
      }
      object.connect(verts);
      break;
    }
    case 77: {
      if (!this.partGroup_ || !(object = this.partGroup_.getObject())) {
        return;
      }
      object.mergeVertices(this.partGroup_.getVertices());
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

  // Select the object hovered by the mouse.
  this.select(this.hover_, e.ctrlKey);
};


/**
 * Handles mouse motion events.
 *
 * @param {Event} e
 */
shapy.editor.Editor.prototype.mouseMove = function(e) {
  var pick, hits, hit, ray, group = this.layout_.active.group, objs, frustum;

  // Find the entity under the mouse.
  if (!!(ray = this.layout_.mouseMove(e))) {
    hit = this.scene_.pickRay(ray, this.mode);
    hits = hit ? [hit] : [];
  } else if (group && group.width > 3 && group.height > 3) {
    frustum = this.layout_.active.groupcast(group);
    hits = this.scene_.pickFrustum(frustum, this.mode);
  } else {
    hits = [];
  }

  // Filter out all parts that do not belong to the current object.
  if (this.mode.object) {
    pick = new shapy.editor.ObjectGroup(hits);
  } else {
    pick = new shapy.editor.PartsGroup(goog.array.filter(hits, function(e) {
      return this.objectGroup_.contains(e.object);
    }, this));
  }

  // Highlight the current object.
  if (this.hover_) {
    this.hover_.setHover(false);
  }
  this.hover_ = pick;
  if (this.hover_) {
    this.hover_.setHover(true);
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
  this.layout_.mouseWheel(e);
};

