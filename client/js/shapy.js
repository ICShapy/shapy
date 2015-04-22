// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.require('shapy.HttpService');
goog.require('shapy.AuthService');
goog.require('shapy.editor.module');

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
            /** @public {string} @export */
            this.passw = '';
            /** @public {string} @export */
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
      url: 'warehouse'
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
 * Ses up the http interceptor.
 *
 * @private
 * @ngInject
 */
shapy.configHttp_ = function($httpProvider) {
  $httpProvider.interceptors.push(['$q', function($q) {
    return new shapy.HttpService($q);
  }]);
};



/**
 * Main application module.
 * @public {Object}
 * @const
 */
shapy.module = angular
  .module('shShapy', [
      'shEditor',
      'ngSanitize',
      'ngRoute',
      'ui.router'
  ])
  .service('shAuth', shapy.AuthService)
  .config(shapy.configStates_)
  .config(shapy.configHttp_);
