// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.RegisterController');
goog.provide('shapy.email');


/**
 * Controller for the registration page.
 *
 * @constructor
 * @ngInject
 */
shapy.RegisterController = function($scope) {
  /** 
   * Name of the user.
   * @public {string}
   * @export
   */
  this.firstName = '';

  /** 
   * lastName of the user.
   * @public {string}
   * @export
   */
  this.lastName = '';  

  /**
   * Email of the user.
   * @public {string}
   * @export
   */
  this.email = '';

  /**
   * Password of the user.
   * @public {string}
   * @export
   */
  this.password = '';

  $scope.$watchGroup([
      'registerCtrl.firstName',
      'registerCtrl.lastName',
      'registerCtrl.email',
      'registerCtrl.password'
    ], goog.bind(function() {
      console.log(this.email);
    }, this));
};


/**
 * @return {!angular.Directive}
 */
shapy.email = function($http, $q) {
  return {
    require: 'ngModel',
    link: function($scope, elem, attrs, ngModel) {
      ngModel.$asyncValidators.email = function(modelValue, viewValue) {
        return $http.get('/api/user/check', { email: viewValue })
            .success(function(data) {
              ngModel.$setValidity('unique', data.isUnique);
            }).error(function(data) {
              ngModel.$setValidity('unique', false);
            });
      };
    }
  };
};