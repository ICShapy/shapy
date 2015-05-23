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
goog.require('shapy.editor.Layout');
goog.require('shapy.editor.Layout.Single');
goog.require('shapy.editor.Layout.Double');
goog.require('shapy.editor.Layout.Quad');
goog.require('shapy.editor.Object');
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
      default: {
        console.error('Invalid message type "' + data['type'] + '"');
        break;
      }
    }
  }, this));
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
   * @private {!Object<string, shapy.Object>} @const
   */
  this.objects_ = {};

  /**
   * Size of the canvas.
   * @private {!goog.math.Size} @const
   */
  this.vp_ = new goog.math.Size(0, 0);

  /**
   * Root layout.
   * @public {!shapy.editor.Layout} @const
   */
  this.layout = new shapy.editor.Layout.Single();

  $rootScope.$on('editor', goog.bind(this.onEvent_, this));
};


/**
 * Init callback.
 *
 * Since the controller cannot access the directive, WebGL must be explicitly
 * initialised by calling this method and passing in a handle to the context.
 *
 * @param {HTMLCanvasElement} canvas Canvas element.
 */
shapy.editor.CanvasController.prototype.init = function(canvas) {
  // Fetch nodes.
  this.canvas_ = canvas;
  this.parent_ = goog.dom.getParentElement(this.canvas_);
  this.gl_ = this.canvas_.getContext('webgl');
  this.gl_.getExtension('OES_standard_derivatives');
  this.renderer_ = new shapy.editor.Renderer(this.gl_);

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

  // Clear the screen, render the scenes and then render overlays.
  this.renderer_.start();
  goog.object.forEach(this.layout.viewports, function(vp, name) {
    this.renderer_.renderScene(vp);
  }, this);
  goog.object.forEach(this.layout.viewports, function(vp, name) {
    this.renderer_.renderOverlay(vp);
  }, this);
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
 * @return {!angular.directive}
 */
shapy.editor.CanvasDirective = function() {
  return {
    restrict: 'A',
    scope: {},
    controller: shapy.editor.CanvasController,
    controllerAs: 'canvasCtrl',
    link: function($scope, $elem, $attrs, canvasCtrl) {
      var running = true;

      // Set up the context.
      canvasCtrl.init($elem[0]);

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

      // Mouse events.
      $($elem[0])
        .mousedown(wrap(function(e) { canvasCtrl.layout.mouseDown(e); }))
        .mouseup(wrap(function(e) { canvasCtrl.layout.mouseUp(e); }))
        .mouseenter(wrap(function(e) { canvasCtrl.layout.mouseEnter(e); }))
        .mouseleave(wrap(function(e) { canvasCtrl.layout.mouseLeave(e); }))
        .mousemove(wrap(function(e) { canvasCtrl.layout.mouseMove(e); }))
        .bind('mousewheel', wrap(function(e) {
            canvasCtrl.layout.mouseWheel(e);
        }))
        .bind('contextmenu', wrap(function(e) {
            return false;
        }));
    }
  };
};

