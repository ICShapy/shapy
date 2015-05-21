// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.menu');



/**
 * Menu directive.
 *
 * @return {!angular.Directive}
 */
shapy.menu = function() {
  return {
    restrict: 'E',
    link: function($scope, $elem) {
      $('>div', $elem[0]).each(function() {
        var child = $('>ul', this);
        child.hide();

        $(this)
          .mouseenter(function() {
            child.show();
          })
          .mouseleave(function() {
            child.hide();
          });
      });
    }
  };
};
