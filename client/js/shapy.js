// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.require('shapy.AuthService');
goog.require('shapy.editor.module');
goog.require('shapy.highlight');
goog.require('shapy.notification.module');

goog.provide('shapy.module');



/**
 * Sets up the routes.
 *
 * @private
 * @ngInject
 */
shapy.configStates_ = function(
    $stateProvider,
    $urlRouterProvider,
    $locationProvider)
{
  $locationProvider.html5Mode(true);
  $urlRouterProvider.otherwise('/');
  $stateProvider
    .state('main', {
      url: '/',
      resolve: {
        user: function(shAuth) {
          return shAuth.auth();
        }
      },
      views: {
        'header@': {
          templateUrl: '/html/header.html',
          controllerAs: 'headerCtrl',
          controller: function($state, shAuth, user) {
            this.user = user;
            /** @export */
            this.logout = function() {
              shAuth.logout().then(function() {
                $state.go('main', null, { reload: true });
              });
            };
          }
        },
        'body@': {
          templateUrl: '/html/main.html'
        }
      }
    })
    .state('main.login', {
      url: 'login',
      views: {
        'body@': {
          templateUrl: '/html/login.html',
          controllerAs: 'loginCtrl',
          controller: function($state, shAuth) {
            /** @public {string} */
            this.passw = '';
            /** @public {string} */
            this.email = '';
            /** @export */
            this.login = function() {
              shAuth.login(this.email, this.passw).then(function() {
                $state.go('main', null, { reload: true });
              });
            };
          }
        }
      }
    })
    .state('main.projects', {
      url: 'projects'
    })
    .state('main.editor', {
      url: 'editor',
      views: {
        'body@': {
          templateUrl: '/html/editor.html',
          controllerAs: 'editorCtrl',
          controller: 'EditorController'
        }
      }
    })
    .state('main.help', {
      url: 'help'
    })
    .state('main.warehouse', {
      url: 'warehouse',
      views: {
        'body@': {
          templateUrl: '/html/warehouse.html'
        }
      }
    })
    .state('main.register', {
      url: 'register',
      views: {
        'body@': {
          template: 'register'
        }
      }
    });
};


/**
 * Intercepts failed HTTP requests.
 *
 * @ngInject
 *
 * @param {!angular.$q}                 $q       The angular promise serivce.
 * @param {!shapy.notification.Service} shNotify Notification service.
 *
 * @return {!angular.$httpInterceptor}
 */
shapy.HttpInterceptor = function($q, shNotify) {
  return {
    responseError: function(error) {
      var data, message;

      try {
        data = JSON.parse(error.data);
      } catch (e) {
        data = null;
      }

      if (data && data['error']) {
        message = data['error'];
      } else {
        message = 'HTTP ' + error.status + ': ' + error.statusText;
      }

      shNotify.error({
        text: message,
        dismiss: 3000
      });

      return $q.reject(message);
    }
  };
};


/**
 * Ses up the http interceptor.
 *
 * @private
 * @ngInject
 */
shapy.configHttp_ = function($httpProvider) {
  $httpProvider.interceptors.push('shHttp');
};



/**
 * Main application module.
 * @public {!angular.Module}
 * @const
 */
shapy.module = angular
  .module('shShapy', [
      'shEditor',
      'shNotify',
      'ngSanitize',
      'ngRoute',
      'ui.router'
  ])
  .service('shAuth', shapy.AuthService)
  .directive('shHighlight', shapy.highlight)
  .factory('shHttp', shapy.HttpInterceptor)
  .config(shapy.configStates_)
  .config(shapy.configHttp_);
