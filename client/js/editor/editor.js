// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.module');

goog.require('goog.dom');
goog.require('goog.math.Size');
goog.require('goog.object');
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
 * @param {!angular.$location} $location Angular location service.
 */
shapy.editor.EditorController = function($location) {
  /**
   * WebSocket connection.
   * @private {WebSocket} @const
   */
  this.sock_ = new WebSocket('ws://' + $location.host() + ':' + $location.port() + '/sock');
};



/**
 * Canvas controller class.
 *
 * @constructor
 */
shapy.editor.CanvasController = function() {
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
   * Root layout.
   * @private {!shapy.editor.Layout} @const
   */
  this.layout_ = new shapy.editor.Layout.Double();

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
  this.gl_.getExtension("OES_standard_derivatives");
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
    this.layout_.resize(width, height);
  }

  // Clear the screen.
  this.renderer_.start();
  goog.object.forEach(this.layout_.viewports, function(vp, name) {
    this.renderer_.render(vp);
  }, this);
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
    }
  };
};



/**
 * @public {!angular.Module}
 * @const
 */
shapy.editor.module = angular
  .module('shEditor', [])
  .controller('EditorController', shapy.editor.EditorController)
  .directive('shCanvas', shapy.editor.CanvasDirective);