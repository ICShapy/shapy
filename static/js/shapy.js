// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.require('shapy.HttpService');
goog.require('shapy.AuthService');



/**
 * Sets up the routes.
 *
 * @private
 * @ngInject
 */
shapy.configRoutes_ = function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'home.html',
      controller: MainController,
      controllerAs: 'mainCtrl'
    })
    .when('/models', {
      templateUrl: 'models.html',
      controller: ModelsController,
      controllerAs: 'modelsCtrl',
      resolve: {
        user: function(shAuth) { 
          return shAuth.login(); 
        }
      }
    })
    .when('/editor/:model', {
      templateUrl: 'editor.html',
      controller: EditorController,
     eq controllerAs: 'editorCtrl',
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
shapy.configHttp_ = function(shHttp) {
  $httpProvider.interceptors.push(shHttp);
};



angular
  .module('shapy', ['shEditor', 'ngSanitize', 'ngRoute'])
  .service('shAuth', shapy.AuthService)
  .service('shHttp', shapy.HttpService)
  .config(shapy.configRoutes_)
  .config(shapy.configHttp_);


