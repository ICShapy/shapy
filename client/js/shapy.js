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
shapy.configRoutes_ = function($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
  $routeProvider
    .when('/', {
      templateUrl: '/html/main.html',
      controller: 'MainController',
      controllerAs: 'mainCtrl'
    })
    .when('/editor/:model', {
      templateUrl: '/html/editor.html',
      controller: 'EditorController',
      controllerAs: 'editorCtrl',
      resolve: {
        user: function(shAuth) {
          return shAuth.login();
        }
      }
    })
    .otherwise({
      redirectTo: '/'
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
      'shMain',
      'shEditor',
      'ngSanitize',
      'ngRoute'
  ])
  .service('shAuth', shapy.AuthService)
  .config(shapy.configRoutes_)
  .config(shapy.configHttp_);


