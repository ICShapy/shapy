// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.module');

goog.require('goog.dom');
goog.require('goog.math.Size');
goog.require('goog.webgl');
goog.require('shapy.Camera');
goog.require('shapy.Object');
goog.require('shapy.gfx.Renderer');



/**
 * @constructor
 */
shapy.editor.EditorController = function() {
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
   * @private {shapy.gfx.Renderer} @const
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
  this.renderer_ = new shapy.gfx.Renderer(this.gl_);

  // Set up resources.
  this.gl_.clearColor(0, 0, 0, 1);
};


/**
 * Render callback.
 */
shapy.editor.CanvasController.prototype.render = function() {
  // Resize the canvas.
  this.vp_.width = this.canvas_.width = this.parent_.offsetWidth;
  this.vp_.height = this.canvas_.height = this.parent_.offsetHeight;
  this.gl_.viewport(0, 0, this.vp_.width, this.vp_.height);

  // Clear the screen.
  this.gl_.clear(goog.webgl.COLOR_BUFFER_BIT | goog.webgl.DEPTH_BUFFER_BIT);
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
 * @public {Object}
 * @const
 */
shapy.editor.module = angular
  .module('shEditor', [])
  .controller('EditorController', shapy.editor.EditorController)
  .directive('shCanvas', shapy.editor.CanvasDirective);