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
 * @param {!angular.$scope}               $rootScope Root scope.s
 * @param {!angular.$http}                $http The angular $http service.
 * @param {!shapy.browser.BrowserService} shBrowser The browser service.
 */
shapy.browser.BrowserController = function($rootScope, $http, shBrowser) {
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!shapy.browser.BrowserService} @const */
  this.shBrowser_ = shBrowser;

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
   * Public home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  this.homePublic = this.shBrowser_.homePublic;

  /**
   * Private home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  this.home = this.shBrowser_.home;

  /**
   * Assets in current directory.
   * TODO: get rid of this, redundant, use currentDir instead everywhere.
   * @type Array
   * @public
   * @export
   */
  this.assets = [];

  // Enter home folder.
  this.shBrowser_.path = [];
  this.assetEnter(this.home);

  /**
   * Query from user filtering results.
   * @public {string}
   * @export
   */
  this.query = 'file';

  // TODO: use service, get rid of message passing.
  $rootScope.$on('browser', goog.bind(function(name, data) {
    switch (data['type']) {
      case 'query': {
        this.query = data['query'];
        break;
      }
      case 'pathAsset': {
        this.assetEnter(data['asset']);
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
  // Update path with dir.
  // Do not update if we entered public space.
  if (!this.public) {
    this.shBrowser_.path.push(dir);
  }

  if (dir.loaded) {
    this.assets = dir.subdirs.concat(dir.otherAssets);
  } else {
    // TODO: name not necesary, use return this.queryDir.then(function{..})
    // Query database for the contents
    var promise = this.shBrowser_.queryDir(dir, this.public);
    // Update assets with answer from database.
    promise.then(goog.bind(function(assets) {
      this.assets = assets;
    }, this));
  }
};

/**
 * Creates new subdir in current dir.
 *
 * @return {!angular.$q}
 */
shapy.browser.BrowserController.prototype.createDir = function() {
  return this.shBrowser_.createDir(this.public, this.currentDir)
      .then(goog.bind(function(dir) {
        this.assets.push(dir);
      }, this));
};

/**
 * Enters public assets space.
 *
 */
shapy.browser.BrowserController.prototype.publicEnter = function() {
  this.public = true;
  this.currentDir = this.homePublic;
  this.displayDir(this.homePublic);
};

/**
 * Enters directory chosen from folder tree.
 *
 * @param {!shapy.browser.Asset.Dir} dir Dir to enter.
 */
shapy.browser.BrowserController.prototype.enterFromTree = function(dir) {
  // Compose new path to current dir.
  var newPath = [];
  var current = dir;
  while (current.parent !== null) {
    current = current.parent;
    newPath.push(current);
  }
  newPath.reverse();

  // Pass new path to toolbar.
  this.shBrowser_.path = newPath;

  // Enter the directory.
  this.assetEnter(dir);
};

/**
 * Updates subdirectories of provided directory.
 *
 * @param {!shapy.browser.Asset.Dir} dir Dir which subdirs we update.
 */
shapy.browser.BrowserController.prototype.subdirs = function(dir) {
  if (!dir.loaded) {
    // Query database for the contents - causes automatic update
    var promise = this.shBrowser_.queryDir(dir, this.public);
  }

};

/**
 * Renames the asset with provided name.
 *
 * @param {!shapy.browser.Asset} asset Asset to rename.
 * @param {string} name Name to which we change current name.
 * @return {!angular.$q}
 */
shapy.browser.BrowserController.prototype.rename = function (asset, name) {
  return this.shBrowser_.rename(asset, name);
};



/**
 * Controller for the asset browser toolbar.
 *
 * @constructor
 *
 * @param {!angular.$scope} $rootScope The root scope.
 * @param {!angular.$scope} $scope The toolbar's scope.
 * @param {!shapy.browser.BrowserService} shBrowser The browser service.
 */
shapy.browser.BrowserToolbarController = function(
    $rootScope,
    $scope,
    shBrowser)
{
  /** @private {!agular.$scope} @const */
  this.rootScope_ = $rootScope;
  /** @private {!shapy.browser.BrowserService} @const */
  this.shBrowser_ = shBrowser;
  /** @public {string} @const @export */
  this.query = '';

  // If query changed, message BrowserController that new filtering is needed.
  $scope.$watch('browserCtrl.query', goog.bind(function() {
    $rootScope.$emit('browser', {
      type: 'query',
      query: this.query
    });
  }, this));
};

/**
 * Returns path to currently browsed directory.
 *
 * @return {string}
 */
shapy.browser.BrowserToolbarController.prototype.path = function() {
  return this.shBrowser_.path;
};


/**
 * Returns to given asset(dir).
 *
 * @param {!shapy.browser.Asset.Dir} asset Asset to which to return.
 */
shapy.browser.BrowserToolbarController.prototype.assetReturnTo = function(asset)
{
  // Drop redundant tail of path.
  var poppedAsset;
  do {
    poppedAsset = this.shBrowser_.path.pop();
  } while (poppedAsset.id != asset.id);

  // Message BrowserController that user requested returning to
  // given asset from path.
  this.rootScope_.$emit('browser', {
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
      $scope.$watchCollection('browserCtrl.assets', function() {
        adjustWidth();
      });
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
 * @return {Function}
 */
shapy.browser.fileMatch = function() {
  return function(files, pattern) {
    return goog.array.filter(files, function(asset) {
      return goog.string.contains(asset.name, pattern);
    });
  };
};
