// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.modal.Service');
goog.provide('shapy.modal.root');



/**
 * Modal dialog directive.
 *
 * @constructor
 *
 * @param {!shapy.modal.Service} shModal
 * @param {!angular.$compile}    $compile Compiles a template.
 * @param {!angular.$controller} $controller Controller creator.
 *
 * @return {!angular.Directive}
 */
shapy.modal.root = function(shModal, $compile, $controller) {
  return {
    restrict: 'E',
    replace: true,
    template:
      '<div id="modal" ng-show="active">' +
        '<div class="dialog" ng-class="size">' +
          '<div class="title">{{title}}</div>' +
          '<div class="content">DSADS</div>' +
          '<div class="footer">' +
            '<input ' +
                'ng-show="cancel" ' +
                'type="button" ' +
                'ng-click="cancel()" ' +
                'value="Cancel"/>' +
            '<input ' +
                'ng-show="okay" ' +
                'type="button" ' +
                'ng-click="okay()" ' +
                'value="Okay"/>' +
          '</div>' +
        '</div>' +
      '</div>',
    link: function($scope, $elem, $attrs) {
      var content = $('.content', $elem);
      $scope.$watch(function() { return shModal.count; }, function() {
        if (!shModal.template) {
          return;
        }
        content.html(shModal.template);
        $scope.title = shModal.title;
        $scope.size = shModal.size;
        $scope.active = true;
        $scope.okay = false;
        $scope.cancel = false;

        // Instantiate the child controller.
        var child = $scope.$new();
        var controller = $controller(shModal.controller, { $scope: child });
        if (shModal.controllerAs) {
          child[shModal.controllerAs] = controller;
        }

        child.$watch('okay', function(okay) {
          if (!okay) {
            return;
          }
          $scope.okay = function() {
            $scope.active = !!okay();
          };
        });
        child.$watch('cancel', function(cancel) {
          if (!cancel) {
            return;
          }
          $scope.cancel = function() {
            $scope.active = !!cancel();
          };
        });

        $compile(content.contents())(child);
      });
    }
  };
};



/**
 * Modal dialog service.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$scope}   $rootScope Root scope.
 * @param {!angular.$compile} $compile   The Angular template compiler.
 * @param {!angular.$http}    $http      The Angular HTTP service.
 */
shapy.modal.Service = function($rootScope, $compile, $http) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @public {!Object} */
  this.controller = null;
  /** @public {string} */
  this.title = '';
  /** @public {string} */
  this.template = '';
  /** @public {string} */
  this.size = 'small';
  /** @public {number} */
  this.count = 0;
};


/**
 * Opens up a modal dialog.
 *
 * @param {!Object} config
 */
shapy.modal.Service.prototype.open = function(config) {
  this.title = config['title'];
  this.size = config['size'] || 'small';
  this.controller = config['controller'];
  if (config['template']) {
    this.template = config['template'] || '';
    this.count++;
  } else {
    this.http_.get(config['templateUrl']).then(goog.bind(function(data) {
      this.template = data['data'];
      this.count++;
    }, this));
  }
};
