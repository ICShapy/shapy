// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.api');
goog.provide('shapy.editable');
goog.provide('shapy.highlight');

goog.require('goog.string');



/**
 * Prefix of the API.
 *
 * @private {string}
 * @const
 */
shapy.API_PREFIX_ = '/api/';



/**
 * Constructs a URL to an API handle.
 *
 * @param {string} api Api method.
 *
 * @return {string} Final URL.
 */
shapy.api = function(api) {
  return shapy.API_PREFIX_ + api;
};



/**
 * Directive used to highlight the current page in the top bar.
 *
 * @param {!angular.$location} $location Then angular location service.
 *
 * @return {!angular.Directive}
 */
shapy.highlight = function($rootScope, $location) {
  return {
    restrict: 'A',
    link: function($scope, $elem, $attrs) {
      /**
       * Highlights the current link.
       */
      var update = function() {
        var path = $location.path();
        $('a', $elem)
            .each(function() {
              $(this).removeClass('highlight');
            })
            .each(function() {
              var url = $(this).attr('href');
              if (!url ||
                  !goog.string.startsWith(url, path) ||
                  (path.length > url.length && path[url.length] != '/'))
              {
                return true;
              }

              $(this).addClass('highlight');
              return false;
            });
      };

      $rootScope.$on('$locationChangeSuccess', update);
      update();
    }
  };
};


/**
 * Decorator for contenteditable stuff.
 *
 * @return {!angular.Directive}
 */
shapy.editable = function() {
  return {
    restrict: 'E',
    replace: true,
    template: '<span contenteditable=true></span>',
    require: 'ngModel',
    link: function($scope, $elem, $attr, ngModel) {
      ngModel.$render = function() {
        $elem.text(ngModel.$viewValue);
      };

      $elem
        .text(ngModel.$modelValue)
        .blur(function() {
          $scope.$apply(function() {
            var text = $elem.text().replace(/[^a-z0-9 ]/gi, '');
            ngModel.$setViewValue(text || 'Untitled Scene');
            $elem.text(ngModel.$viewValue);
          });
        })
        .keypress(function(e) {
          if (e.which == 13) {
            $elem.blur();
            return false;
          }
          return true;
        });
    }
  };
};
