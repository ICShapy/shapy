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
 *
 * @return {!angular.Directive}
 */
shapy.modal.root = function(shModal) {
  return {
    restrict: 'E',
    replace: true,
    template:
      '<div id="modal" ng-show="active" ng-click="active=false">' +
        '<div class="dialog">' +
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
      $scope.active = false;

      $scope.okay = function() {
        $scope.active = false;
      };

      $scope.cancel = function() {
        $scope.active = false;
      };
    }
  };
};



/**
 * Modal dialog service.
 *
 * @constructor
 * @ngInject
 */
shapy.modal.Service = function() {

};


/**
 * Opens up a modal dialog.
 */
shapy.modal.Service.prototype.dialog = function() {

};
