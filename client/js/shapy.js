// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.require('shapy.AuthService');
goog.require('shapy.SceneService');
goog.require('shapy.highlight');
goog.require('shapy.email');
goog.require('shapy.LoginController');
goog.require('shapy.HeaderController');
goog.require('shapy.RegisterController');
goog.require('shapy.browser.BrowserController');
goog.require('shapy.editor.EditorController');
goog.require('shapy.editor.EditorToolbarController');
goog.require('shapy.editor.CanvasDirective');
goog.require('shapy.notification.notifyBar');
goog.require('shapy.notification.Service');

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
          controller: shapy.HeaderController
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
          controller: shapy.LoginController
        }
      }
    })
    .state('main.browser', {
      url: 'browser',
      views: {
        'body@': {
          templateUrl: '/html/browser.html',
          controllerAs: 'browserCtrl',
          controller: 'BrowserController'
        }
      }
    })
    .state('main.editor', {
      url: 'editor/:sceneID',
      resolve: {
        scene: function(user, shScene, $stateParams) {
          // Generate a user-specific unique ID.
          var time = (new Date()).getTime();
          var name = user ? user.id : 0;

          // Retrieve the scene.
          return shScene.get($stateParams['id'] || (name + '@' + time));
        }
      },
      views: {
        'body@': {
          templateUrl: '/html/editor.html',
          controller: 'EditorController',
          controllerAs: 'editorCtrl'
        },
        'toolbar': {
          templateUrl: '/html/editor-toolbar.html',
          controller: 'EditorToolbarController',
          controllerAs: 'editorCtrl'
        }
      }
    })
    .state('main.help', {
      url: 'help',
      views: {
        'body@': {
          template: 'Help'
        }
      }
    })
    .state('main.register', {
      url: 'register',
      views: {
        'body@': {
          templateUrl: '/html/register.html',
          controllerAs: 'registerCtrl',
          controller: shapy.RegisterController
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
      'ngSanitize',
      'ngRoute',
      'ui.router'
  ])

  .controller('BrowserController', shapy.browser.BrowserController)
  .controller('EditorController', shapy.editor.EditorController)
  .controller('EditorToolbarController', shapy.editor.EditorToolbarController)

  .service('shAuth', shapy.AuthService)
  .service('shScene', shapy.SceneService)
  .service('shNotify', shapy.notification.Service)

  .directive('shCanvas', shapy.editor.CanvasDirective)
  .directive('shHighlight', shapy.highlight)
  .directive('shNotifyBar', shapy.notification.notifyBar)
  .directive('shEmail', shapy.email)

  .factory('shHttp', shapy.HttpInterceptor)

  .config(shapy.configStates_)
  .config(shapy.configHttp_);
