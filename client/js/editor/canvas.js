// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.canvas');



/**
 * Directive attached to the canvas.
 *
 * It is responsible for setting up the WebGL context and delegating all events
 * to the controller.
 *
 * @param {!shapy.SceneService}  shScene  The Scene service.
 * @param {!shapy.editor.Editor} shEditor The editor service.
 *
 * @return {!angular.directive}
 */
shapy.editor.canvas = function(shScene, shEditor) {
  return {
    restrict: 'A',
    link: function($scope, $elem, $attrs, canvasCtrl) {
      /**
       * Wraps an event handler, adjust coordinates for WebGL.
       *
       * @param {Function} method Function to be wrapped.
       *
       * @return {Function} Wrapper.
       */
      var wrap = function(method) {
        return function(e) {
          e.offsetY = $elem.height() - e.offsetY;
          (goog.bind(method, shEditor))(e);
        };
      };

      // Update editor context - bind the canvas to it.
      shEditor.setCanvas($elem[0]);

      // Start rendering.
      shEditor.render();
      $scope.$on('$destroy', function() {
        shEditor.destroy();
      });

      // Listen to key press events.
      $elem
        .bind('contextmenu', function(e) { return false; })
        .bind('selectstart', function(e) { return false; })
        .bind('mousewheel', wrap(shEditor.mouseWheel))
        .mouseenter(wrap(shEditor.mouseEnter))
        .mouseleave(wrap(shEditor.mouseLeave))
        .mousedown(wrap(shEditor.mouseDown))
        .mouseup(wrap(shEditor.mouseUp))
        .mousemove(wrap(shEditor.mouseMove));
      $(window)
        .keydown(wrap(function(e) {
          if (e.target.tagName != 'BODY') {
            return;
          }
          shEditor.keyDown(e);
        }))
        .keyup(wrap(function(e) {
          if (e.target.tagName != 'BODY') {
            return;
          }
          shEditor.keyUp(e);
        }));
    }
  };
};

