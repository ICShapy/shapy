// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.require('shapy.AuthService');
goog.require('shapy.HeaderController');
goog.require('shapy.LoginController');
goog.require('shapy.RegisterController');
goog.require('shapy.SceneService');
goog.require('shapy.UserService');
goog.require('shapy.browser.BrowserController');
goog.require('shapy.browser.BrowserToolbarController');
goog.require('shapy.browser.Service');
goog.require('shapy.browser.file');
goog.require('shapy.browser.fileMatch');
goog.require('shapy.browser.files');
goog.require('shapy.browser.sidebar');
goog.require('shapy.editable');
goog.require('shapy.editor.Editor');
goog.require('shapy.editor.EditorController');
goog.require('shapy.editor.ToolbarController');
goog.require('shapy.editor.canvas');
goog.require('shapy.email');
goog.require('shapy.equals');
goog.require('shapy.highlight');
goog.require('shapy.menu');
goog.require('shapy.notification.Service');
goog.require('shapy.notification.notifyBar');

goog.provide('shapy.module');



/**
 * Sets up the routes.
 *
 * @private
 * @ngInject
 *
 * @param {!angular.$stateProvider} $stateProvider
 * @param {!angular.$urlRouterProvider} $urlRouterProvider
 * @param {!angular.$locationProvider} $locationProvider
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
          controller: shapy.browser.BrowserController,
          controllerAs: 'browserCtrl'
        },
        'toolbar': {
          templateUrl: '/html/browser-toolbar.html',
          controller: shapy.browser.BrowserToolbarController,
          controllerAs: 'browserCtrl'
        }
      }
    })
    .state('main.editor', {
      url: 'editor/:sceneID',
      resolve: {
        scene: function(shBrowser, $stateParams) {
          return shBrowser.getScene($stateParams['sceneID']);
        }
      },
      views: {
        'body@': {
          templateUrl: '/html/editor.html',
          controller: shapy.editor.EditorController,
          controllerAs: 'editorCtrl'
        },
        'toolbar': {
          templateUrl: '/html/editor-toolbar.html',
          controller: shapy.editor.ToolbarController,
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
 * Sets up the http interceptor.
 *
 * @private
 * @ngInject
 *
 * @param {!angular.$httpProvider} $httpProvider Angular HTTP provider.
 */
shapy.configHttp_ = function($httpProvider) {
  $httpProvider.interceptors.push('shHttp');
};


/**
 * Sets up the error page.
 *
 * @private
 * @ngInject
 *
 * @param {!angular.$scope} $rootScope The Angular root scope.
 * @param {!angular.$state} $state The angular state service.
 * @param {!shapy.notification.Service} shNotify The shapy notification service.
 */
shapy.configError_ = function($rootScope, $state, shNotify) {
  $rootScope.$on('$stateChangeError', function(evt, ts, tp, fs, fp, error) {
    shNotify.error({
      text: error['error'] || 'Unknown error',
      dismiss: 3000
    });
    $state.go(fs.name ? fs.name : 'main');
  });
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

  .service('shAuth', shapy.AuthService)
  .service('shBrowser', shapy.browser.Service)
  .service('shNotify', shapy.notification.Service)
  .service('shUser', shapy.UserService)
  .service('shEditor', shapy.editor.Editor)

  .directive('shSidebar', shapy.browser.sidebar)
  .directive('shFiles', shapy.browser.files)
  .directive('shFile', shapy.browser.file)
  .directive('shCanvas', shapy.editor.canvas)
  .directive('shEquals', shapy.equals)
  .directive('shHighlight', shapy.highlight)
  .directive('shNotifyBar', shapy.notification.notifyBar)
  .directive('shEmail', shapy.email)
  .directive('shMenu', shapy.menu)
  .directive('shEditable', shapy.editable)

  .factory('shHttp', shapy.HttpInterceptor)

  .filter('shFileMatch', shapy.browser.fileMatch)

  .config(shapy.configStates_)
  .config(shapy.configHttp_)

  .run(shapy.configError_);
