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
  this.home = this.shBrowser_.home = home;

  // Update current dir data.
  this.shBrowser_.updateCurrentDir(this.home);
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
        this.shBrowser_.updateCurrentDir(asset);
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
 * Creates new scene in current dir.
 *
 * @return {!angular.$q}
 */
shapy.browser.BrowserController.prototype.createScene = function() {
  return this.shBrowser_.createScene();
};


/**
 * Creates new texture in current dir.
 *
 * @return {!angular.$q}
 */
shapy.browser.BrowserController.prototype.createTexture = function() {
  return this.shBrowser_.createTexture();
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
 * Returns type of current directory.
 *
 * @return {boolean}
 */
shapy.browser.BrowserToolbarController.prototype.public = function() {
  return this.shBrowser_.public;
};


/**
 * Enters public assets space.
 *
 */
shapy.browser.BrowserToolbarController.prototype.selectPublic = function() {
  this.shBrowser_.getPublic().then(goog.bind(function(dir) {
    this.shBrowser_.public = true;
    this.shBrowser_.current = dir;
  }, this));
};


/**
 * Selects chosen dir from path.
 *
 * @param {!shapy.browser.Asset.Dir} dir Dir chosen by user.
 */
shapy.browser.BrowserToolbarController.prototype.selectPath = function(dir)
{
  this.shBrowser_.getDir(dir.id).then(goog.bind(function(dir) {
    this.shBrowser_.updateCurrentDir(dir);
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

