// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.RegisterController');
goog.provide('shapy.email');
goog.provide('shapy.equals');


/**
 * Controller for the registration page.
 *
 * @constructor
 * @ngInject
 *
 * @param {!angular.$http} $http The angular $http service.
 * @param {!angular.$state} $state The angular $state service.
 * @param {!shapy.AuthService} shUser The authentication service.
 */
shapy.RegisterController = function($http, $state, shUser) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.$state} @const */
  this.state_ = $state;
  /** @private {!angular.shUser} @const */
  this.shUser_ = shUser;

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
  this.shUser_.logout().then(goog.bind(function() {
    this.http_.post('/api/user/register', {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password
    }).success(goog.bind(function() {
      this.state_.go('main', null, { reload: true });
    }, this));
  }, this));
};



/**
 * @return {!angular.Directive}
 */
shapy.email = function($http, $q) {
  return {
    require: 'ngModel',
    link: function($scope, elem, attrs, ngModel) {
      ngModel.$asyncValidators.unique = function(username) {
        var def = $q.defer();

        $http.get('/api/user/check/' + username)
            .success(function(data) {
              if (!data['unique']) {
                def.reject();
              } else {
                def.resolve();
              }
            })
            .error(function() {
              def.reject();
            });

        return def.promise;
      };
    }
  };
};



/**
 * @return {!angular.Directive}
 */
shapy.equals = function() {
  return {
    require: 'ngModel',
    scope: {
      reference: "=shEquals"
    },
    link: function($scope, elem, attrs, ngModel) {
      ngModel.$validators.equals = function(modelValue) {
        return modelValue == $scope['reference'];
      };

      $scope.$watch("reference", function() {
        ngModel.$validate();
      });
    }
  };
};