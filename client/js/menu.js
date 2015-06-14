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
      var down = false;
      var focus = null;
      $('>div>div', $elem[0]).each(function() {
        var child = $('>ul, .content', this);
        child.hide();

        // If the mouse is pressed, toggle whichever element is the current
        // focus. If the mouse moves to a different element, focus on that
        // instead.
        $('>span', this)
          .mousedown(function() {
            down = !down;
            focus = child;
            focus.toggle(down);
            focus.parent().toggleClass('header-button-selected');
          })
          .mouseenter(function() {
            if (down) {
              if (focus) {
                focus.hide();
                focus.parent().removeClass('header-button-selected');
              }
              focus = child;
              focus.show();
              focus.parent().addClass('header-button-selected');
            }
          });

        // Clicking a button in a dropdown will close the dropdown
        /*
        $('>li', child).each(function() {
          $(this)
            .mousedown(function() {

              down = false;
              focus.hide();
            });
        });
      */
      });
    }
  };
};
