// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.require('shapy.AuthService');
goog.require('shapy.browser.BrowserController');
goog.require('shapy.editor.EditorController');
goog.require('shapy.editor.EditorToolbarController');
goog.require('shapy.editor.CanvasDirective');
goog.require('shapy.highlight');
goog.require('shapy.notification.notifyBar');
goog.require('shapy.notification.Service');
goog.require('shapy.RegisterController');

goog.provide('shapy.module');



/**
 * Controller for the header.
 *
 * @constructor
 * @ngInject
 * @private
 */
shapy.HeaderController_ = function($state, shAuth, user) {
  /** @export */
  this.user = user;
  /** @private {!shapy.AuthService} @const */
  this.shAuth_ = shAuth;
  /** @private {!angular.$state} @const */
  this.state_ = $state;
};


/**
 * Logout action.
 *
 * @export
 */
shapy.HeaderController_.prototype.logout = function() {
  this.shAuth_.logout().then(goog.bind(function() {
    this.state_.go('main', null, { reload: true });
  }, this));
};



/**
 * Login controller.
 *
 * @constructor
 * @ngInject
 * @private
 */
shapy.LoginController_ = function($state, shAuth) {
  /** @public {string} */
  this.passw = '';
  /** @public {string} */
  this.email = '';
  /** @private {!shapy.AuthService} @const */
  this.shAuth_ = shAuth;
  /** @private {!angular.$state} @const */
  this.state_ = $state;
};


/**
 * Login action.
 */
shapy.LoginController_.prototype = function() {
  this.shAuth_.login(this.email, this.passw).then(goog.bind(function() {
    this.state_.go('main', null, { reload: true });
  }, this));
};



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
          controller: shapy.LoginController_
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
      url: 'editor/:id',
      views: {
        'body@': {
          templateUrl: '/html/editor.html',
          controller: 'EditorController',
          controllerAs: 'editorCtrl'
        },
        'toolbar': {
          templateUrl: '/html/editor-toolbar.html',
          controller: 'EditorToolbarController',
          controllerAs: 'edtorCtrl'
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
  .service('shNotify', shapy.notification.Service)

  .directive('shCanvas', shapy.editor.CanvasDirective)
  .directive('shHighlight', shapy.highlight)
  .directive('shNotifyBar', shapy.notification.notifyBar)

  .factory('shHttp', shapy.HttpInterceptor)

  .config(shapy.configStates_)
  .config(shapy.configHttp_);
