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


/**
 * Show or hide the current dropdown menu
 * @param  {boolean} show
 */
shapy.toggleDropdown = function(show) {
  var ctx = shapy.menuContext;
  ctx.visible = show;
    if (ctx.focus) {
    ctx.focus.toggle(show);
    if (show) {
      console.log(ctx.focus.parent());
      ctx.focus.parent()
        .removeClass('toolbar-button')
        .addClass('toolbar-button-selected');
    } else {
      ctx.focus.parent()
        .removeClass('toolbar-button-selected')
        .addClass('toolbar-button');
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
              shapy.toggleDropdown(false);
              ctx.focus = child;
              shapy.toggleDropdown(true);
            }
          });
      });
    }
  };
};
