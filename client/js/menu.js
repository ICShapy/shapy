// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.menu');


/**
 * Context for the menu toggle function
 */
shapy.menuContext = {
  visible: false,
  focus: null
};


shapy.toggleDropdown = function(show) {
  var ctx = shapy.menuContext;
  ctx.visible = show;
    if (ctx.focus) {
    ctx.focus.toggle(show);
    if (show) {
      ctx.focus.parent().addClass('header-button-selected');
    } else {
      ctx.focus.parent().removeClass('header-button-selected');
    }
  }
};


/**
 * Menu directive.
 *
 * @return {!angular.Directive}
 */
shapy.menu = function() {
  return {
    restrict: 'E',
    link: function($scope, $elem) {
      $('>div>div', $elem[0]).each(function() {
        var ctx = shapy.menuContext;
        var child = $('>ul, .content', this);
        child.hide();

        // If the mouse is pressed, toggle whichever element is the current
        // focus. If the mouse moves to a different element, focus on that
        // instead.
        $('>span', this)
          .mousedown(function() {
            ctx.visible = !ctx.visible;
            ctx.focus = child;
            shapy.toggleDropdown(ctx.visible);
          })
          .mouseenter(function() {
            if (ctx.visible) {
              if (ctx.focus) {
                ctx.focus.hide();
                ctx.focus.parent().removeClass('header-button-selected');
              }
              ctx.focus = child;
              ctx.focus.show();
              ctx.focus.parent().addClass('header-button-selected');
            }
          });

        // Clicking a button in a dropdown will close the dropdown
        /*
        $('>li', child).each(function() {
          $(this)
            .mousedown(function() {
              shapy.toggleDropdown(false);
            });
        });
        */
      });
    }
  };
};
