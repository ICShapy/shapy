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
 *
 * @param {!angular.$http} $http The angular $http service.
 */
shapy.RegisterController = function($http) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;

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

  /**
   * Password confirmation.
   * @public {string}
   * @export
   */
  this.confirm = '';
};


/**
 * Submits the form.
 */
shapy.RegisterController.prototype.register = function() {
  this.http_.post('/api/user/register', {
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    password: this.password
  }).success(goog.bind(function() {
    console.log('success');
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
        return $http.get('/api/user/check/' + viewValue)
            .success(function(data) {
              ngModel.$setValidity('unique', data['unique']);
            }).error(function(data) {
              ngModel.$setValidity('unique', false);
            });
      };
    }
  };
};