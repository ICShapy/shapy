// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.BrowserController');
goog.provide('shapy.browser.BrowserToolbarController');
goog.provide('shapy.browser.sidebar');
goog.provide('shapy.browser.files');
goog.provide('shapy.browser.file');
goog.provide('shapy.browser.fileMatch');

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
  this.assets = [];

  /**
   * Path to current folder
   */
  this.path = [new shapy.browser.Asset.Dir(0, 'home')];

  for (var i = 1; i < 200; ++i) {
    this.assets.push(new shapy.browser.Asset.Dir(i, 'dir' + i));


  }

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
 * Performs action associated with clicking on given asset.
 *
 * @param {!shapy.browser.Asset} asset Asset that is to be entered.
 */
shapy.browser.BrowserController.prototype.assetEnter = function(asset) {
  this.path.push(asset);
  //use service to perform entering
  //temporary - update this.assets with return of service method
  this.assets = []
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
    restrict: 'E',
    link: function($scope, $elem, $attrs) {
      var adjustWidth = function() {
        // Compute the number of elements to have on each row & adjust cells.
        // Width = 20px padding + max 20px for scrollbar.
        // Width of a cell is at most 160 pixels, but it can be scaled down.
        var width = $elem.outerWidth();
        var perRow = Math.floor((width - 40) / 160 + 0.5);
        var cellWidth = Math.floor((width - 40) / perRow - 10);
        $('sh-file', $elem).css('width', cellWidth);
      };

      $(window).resize(adjustWidth);
      $scope.$watch('browserCtrl.files', function() {
        adjustWidth();
      }, true);
    }
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


/**
 * Checks if asset name contains search query.
 *
 * @param {!shapy.browser.Asset} asset Asset to check.
 */
shapy.browser.fileMatch = function() {
  return function(files, pattern) {
    return goog.array.filter(files, function(file) {
      return goog.string.contains(file.name, pattern);
    });
  };
}
