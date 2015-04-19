// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.require('shapy.HttpService');
goog.require('shapy.AuthService');
goog.require('shapy.main.module');
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
          return shAuth.login();
        }
      },
      views: {
        'header@': {
          templateUrl: '/html/header.html',
          controllerAs: 'headerCtrl',
          controller: function(user) {
            this.user = user;
          }
        },
        'body@': {
          templateUrl: '/html/main.html'
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
    })
    .state('main.login', {
      url: 'login',
      views: {
        'body@': {
          template: 'login'
        }
      }
    })
    .state('main.logout', {
      url: 'logout',
      onEnter: function() {
      }
    })
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
      'shMain',
      'shEditor',
      'ngSanitize',
      'ngRoute',
      'ui.router'
  ])
  .service('shAuth', shapy.AuthService)
  .config(shapy.configStates_)
  .config(shapy.configHttp_);
