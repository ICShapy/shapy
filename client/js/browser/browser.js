// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.BrowserController');
goog.provide('shapy.browser.BrowserToolbarController');
goog.provide('shapy.browser.file');
goog.provide('shapy.browser.fileMatch');
goog.provide('shapy.browser.files');
goog.provide('shapy.browser.sidebar');

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
  /** @private {!angular.$scope} @const */
  this.rootscope_ = $rootScope;
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!angular.shAssets} @const */
  this.shAssets_ = shAssets;

  /**
   * Current directory.
   * @type {shapy.browser.Asset.Dir}
   * @public
   * @export
   */
  this.currentDir = null;

  /**
   * Type of current directory.
   * @type {boolean}
   * @public
   * @export
   */
  this.public = false;

  /**
   * Home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  this.home = this.shAssets_.home;

  /**
   * Assets in current directory.
   * @type Array
   * @public
   * @export
   */
  this.assets = [];

  // Enter home folder.
  this.assetEnter(this.home);

  /**
   * Query from user filtering results.
   * @public {string}
   * @export
   */
  this.query = 'file';

  $rootScope.$on('browser', goog.bind(function(name, data) {
    switch (data['type']) {
      case 'query':
        this.query = data['query'];
        break;
      case 'pathAsset':
        this.assetEnter(data['asset']);
        break;
    }
  }, this));
};

/**
 * Performs action associated with clicking on given asset.
 *
 * @param {!shapy.browser.Asset} asset Asset that is to be entered.
 */
shapy.browser.BrowserController.prototype.assetEnter = function(asset) {
  switch (asset.type) {
    case 'dir' :
      this.public = false;
      this.currentDir = asset;
      this.displayDir(asset);
      break;
    default :
      console.log('assetEnter - unimplemented case!');
  }
};

/**
 * Displays content of given dir.
 *
 * @param {!shapy.browser.Asset.Dir} dir Dir to display.
 */
shapy.browser.BrowserController.prototype.displayDir = function(dir) {
  // Message BrowserToolbarController that path needs to be updated with dir.
  // Do not update if we entered public space.
  if (!this.public) {
    this.rootscope_.$emit('browser', {
        type: 'dir',
        dir: dir
    });
  }

  // Query database for the contents
  var promise = this.shAssets_.queryDir(dir, this.public);
  // Update assets with answer from database.
  promise.then(goog.bind(function(assets) {
    this.assets = assets;
  }, this));
};

/**
 * Creates new subdir in current dir.
 *
 * @param {string} name Name od directory to create,
 */
shapy.browser.BrowserController.prototype.createDir = function(name) {
  // Request addding new dir in database
  var promise = this.shAssets_.createDir(name, this.public, this.currentDir.id);
  // Update contents of current dir.
  promise.then(goog.bind(function(dir) {
    this.assets.push(dir);
  }, this));
};

/**
 * Enters public assets space.
 *
 */
shapy.browser.BrowserController.prototype.publicEnter = function() {
  this.public = true;
  this.currentDir = this.home;
  this.displayDir(this.home);
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
  /** @private {!angular.$scope} @const */
  this.rootscope_ = $rootScope;
  /** @public {string} @const @export */
  this.query = '';

  // If query changed, message BrowserController that new filtering is needed.
  $scope.$watch('browserCtrl.query', goog.bind(function() {
    $rootScope.$emit('browser', {
      type: 'query',
      query: this.query
    });
  }, this));

  /**
   * Path to current folder
   * @public {string}
   * @export
   */
  this.path = [];

  // Add new dir tu current path when user requests entering further dirs.
  $rootScope.$on('browser', goog.bind(function(name, data) {
    switch (data['type']) {
      case 'dir':
        this.path.push(data['dir']);
        break;
    }
  }, this));
};

/**
 * Returns to given asset(dir).
 *
 * @param {!shapy.browser.Asset.Dir} asset Asset (dir) from path to which are returning.
 */
shapy.browser.BrowserToolbarController.prototype.assetReturnTo = function(asset) {
  // Drop redundant tail of path.
  var poppedAsset;
  do {
    poppedAsset = this.path.pop();
  } while (poppedAsset.id != asset.id);
  // Message BrowserController that user requested returning to given asset from path.
  this.rootscope_.$emit('browser', {
      type: 'pathAsset',
      asset: asset
  });
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
      $scope.$watch('browserCtrl.assets', function() {
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
    return goog.array.filter(files, function(asset) {
      return goog.string.contains(asset.name, pattern);
    });
  };
};
