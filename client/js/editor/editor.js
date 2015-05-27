// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.EditorController');
goog.provide('shapy.editor.EditorToolbarController');
goog.provide('shapy.editor.CanvasDirective');

goog.require('goog.dom');
goog.require('goog.math.Size');
goog.require('goog.object');
goog.require('goog.string.format');
goog.require('goog.webgl');
goog.require('shapy.editor.Camera');
goog.require('shapy.editor.Editable');
goog.require('shapy.editor.Layout');
goog.require('shapy.editor.Layout.Single');
goog.require('shapy.editor.Layout.Double');
goog.require('shapy.editor.Layout.Quad');
goog.require('shapy.editor.Renderer');
goog.require('shapy.editor.Viewport');



/**
 * Class handling the editor interface.
 *
 * @constructor
 * @ngInject
 *
 * @param {!shapy.auth.User} user User information.
 * @param {!shapy.Scene} scene Current scene.
 * @param {!angular.$rootScope} $rootScope Angular rootScope.
 * @param {!angular.$scope} $scope Angular scope.
 * @param {!angular.$location} $location Angular location service.
 */
shapy.editor.EditorController = function(
    user,
    scene,
    $rootScope,
    $scope,
    $location)
{
  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;
  /** @private {!angular.$scope} @const */
  this.scope_ = $scope;

  /**
   * Current scene.
   * @public {!shapy.Scene}
   */
  this.scene = scene;

  /**
   * WebSocket connection.
   * @private {WebSocket} @const
   */
  this.sock_ = new WebSocket(goog.string.format(
      'ws://%s:%s/api/edit/%s', $location.host(), $location.port(), scene.id));

  // Set up some event handlers.
  this.sock_.onmessage = goog.bind(this.onMessage_, this);
  this.sock_.onclose = goog.bind(this.onClose_, this);
  this.scope_.$on('$destroy', goog.bind(this.onDestroy_, this));
  this.rootScope_.$on('editor', goog.bind(this.onEditorMessage_, this));
};


/**
 * Called on the receipt of a message from the server.
 *
 * @private
 *
 * @param {MessageEvent} evt
 */
shapy.editor.EditorController.prototype.onMessage_ = function(evt) {
  var data;

  // Try to make sense of the data.
  try {
    data = JSON.parse(evt.data);
  } catch (e) {
    console.error('Invalid message: ' + evt.data);
  }

  this.rootScope_.$apply(goog.bind(function() {
    switch (data['type']) {
      case 'join': {
        this.scene.addUser(data['user']);
        break;
      }
      case 'meta': {
        this.scene.setName(data['name']);
        this.scene.setUsers(data['users']);
        break;
      }
      case 'leave': {
        this.scene.removeUser(data['user']);
        break;
      }
      case 'edit': {
        switch (data['tool']) {
          case 'translate': {
            this.scene.objects[data['id']].translate(
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
 * Called when an object in the scene is being edited.
 *
 * @private
 *
 * @param {string} n    Name of the message.
 * @param {Object} data Editor message.
 */
shapy.editor.EditorController.prototype.onEditorMessage_ = function(n, data) {
  this.sock_.send(JSON.stringify(data));
};

/**
 * Called when the server suspends the connection.
 *
 * @private
 *
 * @param {CloseEvent} evt
 */
shapy.editor.EditorController.prototype.onClose_ = function(evt) {
};


/**
 * Called when everything should be closed.
 *
 * @private
 */
shapy.editor.EditorController.prototype.onDestroy_ = function() {
  this.sock_.close();
};



/**
 * Controller for the editor toolbar.
 *
 * @constructor
 *
 * @param {!angular.$scope}    $rootScope The angular root scope.
 * @param {!angular.$scope}    $scope     The angular root scope.
 * @param {!angular.$q}        $q         The angular promise service.
 * @param {!shapy.Scene}       scene      Scene being edited.
 * @param {!shapy.UserService} shUser User service which can cache user info.
 */
shapy.editor.EditorToolbarController = function(
    $rootScope,
    $scope,
    $q,
    scene,
    shUser)
{
  /** @private {!angular.$scope} @const */
  this.rootScope_ = $rootScope;

  /** @public {!shapy.Scene} @const */
  this.scene = scene;
  /** @public {!Array<!shapy.User>} */
  this.users = [];

  $scope.$watch('editorCtrl.scene.users', goog.bind(function(users) {
    $q.all(goog.array.map(this.scene.users, goog.bind(shUser.get, shUser)))
        .then(goog.bind(function(users) {
          this.users = users;
        }, this));
  }, this), true);
};


/**
 * Called when the layout has to be changed.
 *
 * @param {string} name Name of the new layout.
 */
shapy.editor.EditorToolbarController.prototype.layout = function(name) {
  this.rootScope_.$emit('editor', {
    type: 'layout',
    layout: name
  });
};


/**
 * Called when new object has to be added.
 *
 * @param {string} name Name of the object.
 */
shapy.editor.EditorToolbarController.prototype.addObject = function(name) {
  this.rootScope_.$emit('editor', {
    type: 'addObject',
    object: name
  });
};



/**
 * Canvas controller class.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$scope} $rootScope The angular root scope.
 */
shapy.editor.CanvasController = function($rootScope) {
  /**
   * Canvas element where stuff is rendered.
   * @private {HTMLCanvasElement}
   */
  this.canvas_ = null;

  /**
   * Parent node of the canvas.
   * @private {!HTMLElement}
   */
  this.parent_ = null;

  /**
   * WebGL rendering context attached to the canvas.
   * @private {WebGLRenderingContext}
   */
  this.gl_ = null;

  /**
   * Renderer that manages all WebGL resources.
   * @private {shapy.editor.Renderer} @const
   */
  this.renderer_ = null;

  /**
   * Map of all objects in the scene.
   * @private {!shapy.Scene}
   */
  this.scene_ = null;

  /**
   * Currently selected object
   * @public {shapy.editor.Object}
   */
  this.selectedObject = null;

  /**
   * Size of the canvas.
   * @private {!goog.math.Size} @const
   */
  this.vp_ = new goog.math.Size(0, 0);

  /**
   * Active rig.
   * @public {!shapy.editor.Rig}
   */
  this.rig = null;

  /**
   * Root layout.
   * @public {!shapy.editor.Layout} @const
   */
  this.layout = new shapy.editor.Layout.Single();
  this.layout.active.rig = this.rig;

  $rootScope.$on('editor', goog.bind(this.onEvent_, this));


  /** @private {!shapy.editor.Rig} @const */
  this.rigTranslate_ = new shapy.editor.Rig.Translate();
  this.rigTranslate_.onFinish = goog.bind(function(obj, x, y, z) {
    // TODO: find a better way to distinguish objects.
    if (obj.object != obj) {
      return;
    }
    $rootScope.$broadcast('editor', {
      'type': 'edit',
      'tool': 'translate',
      'id': obj.id,
      'x': x,
      'y': y,
      'z': z
    });
  }, this);

  /** @private {!shapy.editor.Rig} @const */
  this.rigRotate_ = new shapy.editor.Rig.Rotate();
  this.rigRotate_.onFinish = goog.bind(function(x, y, z) {
  }, this);

  /** @private {!shapy.editor.Rig} @const */
  this.rigScale_ = new shapy.editor.Rig.Scale();
  this.rigScale_.onFinish = goog.bind(function(x, y, z) {
  }, this);
};


/**
 * Used for generation object ids.
 * @type {number}
 */
shapy.editor.CanvasController.ID = 1;


/**
 * Init callback.
 *
 * Since the controller cannot access the directive, WebGL must be explicitly
 * initialised by calling this method and passing in a handle to the context.
 *
 * @param {HTMLCanvasElement} canvas Canvas element.
 * @param {!shapy.Scene}      scene      The current scene.
 */
shapy.editor.CanvasController.prototype.init = function(canvas, scene) {
  // Fetch nodes.
  this.canvas_ = canvas;
  this.scene_ = scene;
  this.parent_ = goog.dom.getParentElement(this.canvas_);
  this.gl_ = this.canvas_.getContext('webgl', {stencil: true});
  this.gl_.getExtension('OES_standard_derivatives');
  this.renderer_ = new shapy.editor.Renderer(this.gl_);

  //this.scene_.objects['x'] = shapy.editor.Object.createCube('x', 0.5, 0.5, 0.5);
  //this.scene_.objects['x'].translate_[2] = -5;

  //this.scene_.objects['y'] = shapy.editor.Object.createCube('y', 0.5, 0.5, 0.5);
  //this.selectObject(this.scene_.objects['y']);
  //this.changeRig_(this.rigTranslate_);

  // Set up resources.
  this.gl_.clearColor(0, 0, 0, 1);
};


/**
 * Render callback.
 */
shapy.editor.CanvasController.prototype.render = function() {
  var width = this.parent_.offsetWidth, height = this.parent_.offsetHeight;

  // Resize the canvas if it changes.
  if (this.vp_.width != width || this.vp_.height != height) {
    this.vp_.width = this.canvas_.width = this.parent_.offsetWidth;
    this.vp_.height = this.canvas_.height = this.parent_.offsetHeight;
    this.layout.resize(width, height);
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
  goog.object.forEach(this.layout.viewports, function(vp, name) {
    vp.camera.compute();
    vp.camCube.compute();
    this.renderer_.renderObjects(vp);
    this.renderer_.renderGround(vp);
    this.renderer_.renderBorder(vp);
    this.renderer_.renderCamCube(vp);
  }, this);

  // Second pass - render rigs.
  if (this.layout.active && this.layout.active.rig) {
    this.renderer_.renderRig(this.layout.active, this.layout.active.rig);
  }
};


/**
 * Dummy method for generating unique object ids.
 *
 * TODO: take user into account when generating ids.
 *
 * @return {string} Object ID.
 */
shapy.editor.CanvasController.generateId = function() {
  return 'obj' + shapy.editor.CanvasController.ID++;
};


/**
 * Select an object.
 *
 * @param {shapy.editor.Object} o
 */
shapy.editor.CanvasController.prototype.selectObject = function(o) {
  this.selectedObject = o;
  if (this.rig) {
    this.rig.controlObject_ = o;
  }
};


/**
 * Change rig type
 *
 * @private
 *
 * @param {shapy.editor.Rig} rig
 */
shapy.editor.CanvasController.prototype.changeRig_ = function(rig) {
  this.rig = rig;
  this.layout.active.rig = this.rig;
  this.rig.controlObject_ = this.selectedObject;
};


/**
 * On a key press
 *
 * If this CanvasController doesn't want to handle it, pass it to the layout.
 *
 * @param {number} keyCode
 */
shapy.editor.CanvasController.prototype.keyDown = function(keyCode) {
  switch (keyCode) {
    case 84: { // t
      this.changeRig_(this.rigTranslate_);
      break;
    }
    case 82: { // r
      this.changeRig_(this.rigRotate_);
      break;
    }
    case 83: { // s
      this.changeRig_(this.rigScale_);
      break;
    }
    default: {
      this.layout.keyDown(keyCode);
      break;
    }
  }
};


/**
 * Called when an Angular event is received.
 *
 * @private
 *
 * @param {string} name Name of the event.
 * @param {Object} evt Event data.
 */
shapy.editor.CanvasController.prototype.onEvent_ = function(name, evt) {
  switch (evt.type) {
    case 'layout': {
      // Trigger a resize.
      this.vp_.width = this.vp_.height = 0;
      // Change the layout.
      switch (evt.layout) {
        case 'single': this.layout = new shapy.editor.Layout.Single(); break;
        case 'double': this.layout = new shapy.editor.Layout.Double(); break;
        case 'quad': this.layout = new shapy.editor.Layout.Quad(); break;
      }
      this.layout.active.rig = this.rig;
      break;
    }
    case 'addObject': {
      var id = shapy.editor.CanvasController.generateId();

      switch (evt.object) {
        case 'cube': {
          this.scene_.objects[id] =
              shapy.editor.Object.createCubeFromTriangles(id, 0.5, 0.5, 0.5);
          this.selectObject(this.scene_.objects[id]);
          break;
        }
        case 'sphere': {
          console.log('sphere');
          break;
        }
      }
      break;
    }
  }
};


/**
 * Directive attached to the canvas.
 *
 * It is responsible for setting up the WebGL context and delegating all events
 * to the controller.
 *
 * @param {!shapy.SceneService} shScene The Scene service.
 *
 * @return {!angular.directive}
 */
shapy.editor.CanvasDirective = function(shScene) {
  return {
    restrict: 'A',
    scope: {},
    controller: shapy.editor.CanvasController,
    controllerAs: 'canvasCtrl',
    link: function($scope, $elem, $attrs, canvasCtrl) {
      var running = true;

      // Retrieve the scene & attach it to the controller.
      shScene.get('1@1').then(function(scene) {
        // Set up the context.
        canvasCtrl.init($elem[0], scene);

        // Render event.
        (function loop() {
          canvasCtrl.render();
          if (running) {
            requestAnimationFrame(loop);
          }
        }) ();

        // Exit event.
        $scope.$on('$destroy', function() {
          running = false;
        });

        // Wrapper for event handlers that hijacks them completely.
        var wrap = function(method) {
          return function(e) {
            e.offsetY = canvasCtrl.layout.size.height - e.offsetY;
            e.preventDefault();
            e.stopPropagation();
            method(e);
            return false;
          };
        };

        // Key presses.
        $(window).keydown(function(e) { canvasCtrl.keyDown(e.keyCode); });

        // Mouse events.
        $($elem[0])
          .mousedown(wrap(function(e) { canvasCtrl.layout.mouseDown(e); }))
          .mouseup(wrap(function(e) {
            if (canvasCtrl.layout.mouseUp(e) || e.which != 1) {
              return;
            }

            // TODO: find a nicer way to do this.
            var result = canvasCtrl.layout.getViewport(e.offsetX, e.offsetY);
            if (!result.vp) {
              return;
            }

            var ray = result.vp.raycast_(result.x, result.y);
            var pick = scene.pick(ray);
            if (!pick) {
              return;
            }
            canvasCtrl.selectObject(pick);
          }))
          .dblclick(wrap(function(e) {
            var result = canvasCtrl.layout.getViewport(e.offsetX, e.offsetY);
            if (!result.vp || e.which != 1) {
              return;
            }

            var ray = result.vp.raycast_(result.x, result.y);
            var pick = scene.pick(ray);
            if (!pick) {
              return;
            }
            canvasCtrl.selectObject(pick.object);
          }))
          .mouseenter(wrap(function(e) { canvasCtrl.layout.mouseEnter(e); }))
          .mouseleave(wrap(function(e) { canvasCtrl.layout.mouseLeave(e); }))
          .mousemove(wrap(function(e) { canvasCtrl.layout.mouseMove(e); }))
          .bind('mousewheel', wrap(function(e) {
              canvasCtrl.layout.mouseWheel(e);
          }))
          .bind('contextmenu', wrap(function(e) {
              return false;
          }));
      });
    }
  };
};

