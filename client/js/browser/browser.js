// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.BrowserController');
goog.provide('shapy.browser.BrowserToolbarController');
goog.provide('shapy.browser.directories');
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
 * @param {!angular.$state}               $state    The angular state service.
 * @param {!angular.$http}                $http     The angular $http service.
 * @param {!shapy.browser.BrowserService} shBrowser The browser service.
 * @param {!shapy.browser.Asset.Dir}      home      The home directory.
 */
shapy.browser.BrowserController = function($state, $http, shBrowser, home) {
  /** @private {!angular.$state} @const */
  this.state_ = $state;
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!shapy.browser.BrowserService} @const */
  this.shBrowser_ = shBrowser;

  /**
   * Private home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  this.home = this.shBrowser_.home = this.shBrowser_.current = home;

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
};


/**
 * Returns the current directory.
 *
 * @return {!shapy.browser.Asset.Dir}
 */
shapy.browser.BrowserController.prototype.current = function() {
  return this.shBrowser_.current;
};


/**
 * Performs action associated with clicking on given asset.
 *
 * @param {!shapy.browser.Asset} asset Asset that is to be entered.
 */
shapy.browser.BrowserController.prototype.select = function(asset) {
  switch (asset.type) {
    case shapy.browser.Asset.Type.DIRECTORY: {
      this.shBrowser_.getDir(asset.id).then(goog.bind(function(asset) {
        this.shBrowser_.current = asset;
      }, this));
      break;
    }
    case shapy.browser.Asset.Type.SCENE: {
      this.shBrowser_.getScene(asset.id).then(goog.bind(function(asset) {
        this.state_.go('main.editor', { sceneID: asset.id });
      }, this));
      break;
    }
    default :
      console.log('assetEnter - unimplemented case!');
  }
};


/**
 * Creates new subdir in current dir.
 *
 * @return {!angular.$q}
 */
shapy.browser.BrowserController.prototype.createDir = function() {
  return this.shBrowser_.createDir();
};


/**
 * Creates new subdir in current dir.
 *
 * @return {!angular.$q}
 */
shapy.browser.BrowserController.prototype.createScene = function() {
  return this.shBrowser_.createScene();
};


/**
 * Enters public assets space.
 *
 */
shapy.browser.BrowserController.prototype.publicEnter = function() {
  this.public = true;
  this.shBrowser_.currentDir = this.homePublic;
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
    // Query database for the contents - causes automatic update.
    this.shBrowser_.queryDir(dir, this.public);
  }

};

/**
 * Returns query for filtering assets.
 *
 * @return {string}
 */
shapy.browser.BrowserController.prototype.query = function() {
  return this.shBrowser_.query;
};



/**
 * Controller for the asset browser toolbar.
 *
 * @constructor
 *
 * @param {!angular.$scope} $scope The toolbar's scope.
 * @param {!shapy.browser.BrowserService} shBrowser The browser service.
 */
shapy.browser.BrowserToolbarController = function(
    $scope,
    shBrowser)
{
  /** @private {!shapy.browser.BrowserService} @const */
  this.shBrowser_ = shBrowser;
  /** @public {string} @const @export */
  this.query = '';

  // If query changed, message BrowserController that new filtering is needed.
  $scope.$watch('browserCtrl.query', goog.bind(function() {
    this.shBrowser_.query = this.query;
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
  this.shBrowser_.currentDir = asset;
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


/**
 * Filters out the directories.
 *
 * @return {Function}
 */
shapy.browser.directories = function() {
  return function(files) {
    return goog.array.filter(files, function(asset) {
      return asset.type == shapy.browser.Asset.Type.DIRECTORY;
    });
  };
};

