// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.BrowserController');
goog.provide('shapy.browser.BrowserToolbarController');
goog.provide('shapy.browser.sidebar');
goog.provide('shapy.browser.files');
goog.provide('shapy.browser.file');

goog.require('shapy.browser.Asset');
goog.require('shapy.browser.Asset.Dir');
goog.require('shapy.browser.Asset.Scene');
goog.require('shapy.browser.Asset.Texture');



/**
 * Controller for the asset browser.
 *
 * @constructor
 *
 * @param {!angular.$scope} $rootScope The Angular root scope.
 * @param {!angular.$http} $http The angular $http service.
 * @param {!shapy.AssetsService} shAssets The assets management service.
 */
shapy.browser.BrowserController = function($rootScope, $http, shAssets) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.shAssets} @const */
  this.shAssets_ = shAssets;

  /**
   * Assets in current directory.
   * @type Array
   * @public
   * @export
   */
  this.assets =[new shapy.browser.Asset.Dir(1, 'dir1'), new shapy.browser.Asset.Dir(2, 'dir2'),
                new shapy.browser.Asset.Dir(3, 'dir3'), new shapy.browser.Asset.Dir(4, 'dir4'),
                new shapy.browser.Asset.Dir(5, 'dir5'), new shapy.browser.Asset.Dir(6, 'dir6')];
 
  /**
   * Query from user filtering results.
   * @public {string}
   * @export
   */
  this.query = 'file';

  $rootScope.$on('browser', goog.bind(function(name, data) {
    switch (data['type']) {
      case 'query': {
        this.query = data['query'];
        break;
      }
    }
  }, this));
};

/**
 * Checks if asset name contains search query.
 *
 * @param {!shapy.browser.Asset} asset Asset to check.
 */
shapy.browser.BrowserController.prototype.filter = function(asset) {
  return true;//asset.name.includes(this.query);
}

/**
 * Performs action associated with clicking on given asset. 
 *
 * @param {number} Id of the asset
 */
shapy.browser.BrowserController.prototype.asset = function(id) {

};



/**
 * Controller for the asset browser toolbar.
 *
 * @constructor
 *
 * @param {!angular.$scope} $rootScope The Angular root scope.
 * @param {!angular.$scope} $scope The current scope.
 */
shapy.browser.BrowserToolbarController = function($rootScope, $scope) {
  /** @public {string} @const @export */
  this.query = '';

  $scope.$watch('browserCtrl.query', goog.bind(function() {
    $rootScope.$emit('browser', {
      type: 'query',
      query: this.query
    })
  }, this));
};



/**
 * Sidebar directive.
 *
 * @return {!angular.Directive}
 */
shapy.browser.sidebar = function() {
  return {
    restrict: 'E'
  };
};



/**
 * Files directive.
 *
 * @return {!angular.Directive}
 */
shapy.browser.files = function() {
  return {
    restrict: 'E'
  };
};



/**
 * File directive.
 *
 * @return {!angular.Directive}
 */
shapy.browser.file = function() {
  return {
    restrict: 'E'
  };
};

