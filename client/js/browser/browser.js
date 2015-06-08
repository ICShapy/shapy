// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.BrowserController');
goog.provide('shapy.browser.BrowserToolbarController');
goog.provide('shapy.browser.directories');
goog.provide('shapy.browser.assetMatch');
goog.provide('shapy.browser.assetOrder');
goog.provide('shapy.browser.asset');
goog.provide('shapy.browser.assets');
goog.provide('shapy.browser.sidebar');
goog.provide('shapy.browser.share');

goog.require('shapy.browser.Asset');
goog.require('shapy.browser.Asset.Dir');
goog.require('shapy.browser.Asset.Scene');
goog.require('shapy.browser.Asset.Texture');



/**
 * Controller for the asset browser.
 *
 * @constructor
 *
 * @param {!angular.$state}          $state    The angular state service.
 * @param {!angular.$http}           $http     The angular $http service.
 * @param {!shapy.browser.Service}   shBrowser The browser service.
 * @param {!shapy.browser.Asset.Dir} home      The home directory.
 */
shapy.browser.BrowserController = function($state, $http, shBrowser, home) {
  /** @private {!angular.$state} @const */
  this.state_ = $state;
  /** @private {!angular.$http} @const */
  this.http_ = $http;
  /** @private {!shapy.browser.Service} @const */
  this.shBrowser_ = shBrowser;

  /**
   * Private home dir.
   *
   * @public {!shapy.browser.Asset.Dir}
   * @const
   */
  this.home = this.shBrowser_.home = home;

  // Update current dir data.
  this.shBrowser_.changeDirectory(this.home);
};


/**
 * Performs action associated with clicking on given asset.
 *
 * @param {!shapy.browser.Asset} asset Asset that is to be entered.
 * @param {boolean}              enter True if the directory should be selected.
 */
shapy.browser.BrowserController.prototype.select = function(asset, enter) {
  switch (asset.type) {
    case shapy.browser.Asset.Type.DIRECTORY: {
      this.shBrowser_.getDir(asset.id).then(goog.bind(function(asset) {
        if (enter) {
          this.shBrowser_.changeDirectory(asset);
        }
      }, this));
      break;
    }
    case shapy.browser.Asset.Type.SCENE: {
      this.state_.go('main.editor', { sceneID: asset.id });
      break;
    }
    default :
      console.log('select - unimplemented case!');
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
 * Renames given asset.
 *
 * @param {!shapy.browser.Asset} asset Asset that is to be renamed.
 * @param {string}               name  New name.
 */
shapy.browser.BrowserController.prototype.rename = function(asset, name) {
  switch (asset.type) {
    case shapy.browser.Asset.Type.DIRECTORY:
      this.shBrowser_.renameDir(asset, name);
      break;
    case shapy.browser.Asset.Type.SCENE:
      this.shBrowser_.renameScene(asset, name);
      break;
  }
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
 * Returns type of current directory.
 *
 * @return {boolean}
 */
shapy.browser.BrowserController.prototype.private = function() {
  return this.shBrowser_.private;
};


/**
 * Returns default name for assets
 *
 * @param {shapy.browser.Asset.Type} type Type of asset for which we return name
 */
shapy.browser.BrowserController.prototype.defaultName = function(type) {
  return this.shBrowser_.defaultName(type);
};



/**
 * Controller for the asset browser toolbar.
 *
 * @constructor
 *
 * @param {!angular.$scope}        $scope    The toolbar's scope.
 * @param {!shapy.browser.Service} shBrowser The browser service.
 */
shapy.browser.BrowserToolbarController = function(
    $scope,
    shBrowser)
{
  /** @private {!shapy.browser.Service} @const */
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
 * Returns the current directory.
 *
 * @return {!shapy.browser.Asset.Dir}
 */
shapy.browser.BrowserToolbarController.prototype.current = function() {
  return this.shBrowser_.current;
};


/**
 * Returns type of current directory.
 *
 * @return {boolean}
 */
shapy.browser.BrowserToolbarController.prototype.private = function() {
  return this.shBrowser_.private;
}


/**
 * Enters public space.
 *
 */
shapy.browser.BrowserToolbarController.prototype.selectPublic = function() {
  this.shBrowser_.getPublic().then(goog.bind(function(dir) {
    this.shBrowser_.private = false;
    this.shBrowser_.current = dir;
  }, this));
};


/**
 * Enters filtered space.
 *
 * @param {number} id Id of the filtered space.
 */
shapy.browser.BrowserToolbarController.prototype.selectFiltered = function(id) {
  this.shBrowser_.getFiltered(id).then(goog.bind(function(dir) {
    this.shBrowser_.private = false;
    this.shBrowser_.current = dir;
  }, this));
};


/**
 * Enters shared space.
 */
shapy.browser.BrowserToolbarController.prototype.selectShared = function() {
  this.shBrowser_.getShared().then(goog.bind(function(dir) {
    this.shBrowser_.private = false;
    this.shBrowser_.current = dir;
  }, this));
};


/**
 * Enters textures space.
 */
shapy.browser.BrowserToolbarController.prototype.selectTextures = function() {
  this.selectFiltered(shapy.browser.Asset.Space.TEXTURES);
};


/**
 * Enters scenes space.
 */
shapy.browser.BrowserToolbarController.prototype.selectScenes = function() {
  this.selectFiltered(shapy.browser.Asset.Space.SCENES);
};


/**
 * Selects chosen dir from path.
 *
 * @param {!shapy.browser.Asset.Dir} dir Dir chosen by user.
 */
shapy.browser.BrowserToolbarController.prototype.selectPath = function(dir) {
  this.shBrowser_.getDir(dir.id).then(goog.bind(function(dir) {
    this.shBrowser_.changeDirectory(dir);
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
 * Assets directive.
 *
 * @return {!angular.Directive}
 */
shapy.browser.assets = function() {
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
        $('sh-asset', $elem).css('width', cellWidth);
      };

      $(window).resize(adjustWidth);
      $scope.$watchCollection('browserCtrl.assets', function() {
        adjustWidth();
      });
    }
  };
};



/**
 * Asset directive.
 *
 * @param {!shapy.modal.Service}     shModal
 *
 * @return {!angular.Directive}
 */
shapy.browser.asset = function(shModal) {
  /**
   * Handles the deletion of an asset.
   * @param {!shapy.browser.Asset} asset
   */
  var doDelete = function(asset) {
    shModal.open({
      size: 'small',
      title: 'Delete Asset',
      template:
          'Are you sure you want to delete ' +
          '<strong>{{asset.name}}</strong>' +
          '?',
      controller: function($scope) {
        $scope.asset = asset;
        $scope.cancel = function() { return false; };
        $scope.okay = function() {
          switch (asset.type) {
            case shapy.browser.Asset.Type.DIRECTORY:
              asset.shBrowser_.deleteDir(asset);
              break;
            case shapy.browser.Asset.Type.SCENE:
              asset.shBrowser_.deleteScene(asset);
              break;
          }
        };
      }
    });
  };

  return {
    restrict: 'E',
    scope: {
      asset: '=',
      selected: '=',
      owner: '=',
    },
    link: function($scope, $elem) {
      $(window).on('keydown', function(evt) {
        if (evt.keyCode != 100 && evt.keyCode != 8) {
          return;
        }
        if ($scope.asset != $scope.selected) {
          return;
        }
        if (!($scope.owner)) {
          return false;
        }
        $scope.$apply(function() {
          doDelete($scope.asset);
        });
        evt.stopPropagation();
        evt.preventDefault();
        return false;
      });
      $scope.$on('$destroy', function() {
        $(window).off('keydown');
      });

      // Show context menu
      $elem.bind('contextmenu', function(evt) {
        // No context menu fot dirs
        if ($scope.asset.type == shapy.browser.Asset.Type.DIRECTORY) {
          return false;
        }
        // Select
        $scope.$apply(function() {
          $scope.selected = $scope.asset;
        });
        // Block default
        evt.stopPropagation();
        evt.preventDefault();
        // Show
        var y = evt.pageY - 30;
        $('.asset-menu').show().
          css({
              top: y + 'px',
              left: evt.pageX + 'px'
          });
        return false;
      });

      // Hide menu, deselect
      $(window).on('mousedown', function(evt) {
        if (($(evt.target).hasClass('assetmenu') && evt.which == 3)) {
          return;
        }

        $('.asset-menu').hide(200);
        $scope.$apply(function() {
          $scope.selected = null;
        });

      });
    }
  };
};



/**
 * Sharing directive.
 *
 * @param {!shapy.modal.Service}       shModal
 * @param {!shapy.browser.Service}     shBrowser
 *
 * @return {!angular.Directive}
 */
shapy.browser.share = function(shModal, shBrowser) {

  /**
   * Handles sharing of an asset.
   * @param {!shapy.browser.Asset} asset
   */
  var share = function(asset) {
    var available = [];
    var shared = [];
    shBrowser.getPermissions(asset).then(goog.bind(function(response) {
      //retrieve available emails and those with which asset is already shared
      available = response[0];
      shared = response[1];

      //open sharing dialog
      shModal.open({
        size: 'medium',
        title: 'Share Asset',
        template:
            '<div class="sharing-add">' +
            '  <input id="shared-with" placeholder="Share.." ng-model="input">' +
            '  <span id="new-write" ng-click="newWrite()">Write</span>' +
            '  <button id="add"' +
            '          ng-click="add()"' +
            '          ng-style="(isAvailable())? {{style}}">' +
            '    Add' +
            '  </button>' +
            '</div>' +
            '<span id="shared-text">Shared with:</span> ' +
            '<div class="permission-list">' +
            '  <div ng-repeat="permission in shared">' +
            '    <div class="permission">' +
            '        <span id="email"' +
            '               ng-click="select(permission)"' +
            '               ng-class="{selectedperm: permission == whichSelected()}">' +
            '          {{permission.email}}' +
            '        </span>' +
            '        <span id="write" ng-style="(permission.write) ? {{black}} : {{gray}}">Write</span>' +
            '    </div>' +
            '  </div>' +
            '</div>' +
            '<button id="remove" ng-click="remove()">Remove</button>',
        controller: function($scope) {
          $scope.style = "{'cursor' : 'pointer'} : {'color' : 'gray'}";
          $scope.black = "{'color':'black', 'font-weight': 'bold'}";
          $scope.gray = "{'color': 'gray', 'font-weight': 'normal'}";
          $scope.selected = null;
          $scope.asset = asset;
          $scope.write = false;
          $scope.available = available;
          $scope.shared = shared;

          $scope.cancel = function() { return false; };
          $scope.okay = function() {
            shBrowser.setPermissions(asset, $scope.shared);
          };
          $scope.add = function() {
            // check if available
            if (!$scope.isAvailable()) {
              return;
            }

            var newCollab = document.getElementById('shared-with');
            var newEmail = newCollab.value;
            for (var i = 0; i < $scope.shared.length; i++) {
              // update if in list
              if ($scope.shared[i].email === newEmail) {
                $scope.shared[i].write = $scope.write;
                // Clean
                $scope.write = true;
                $scope.newWrite();
                newCollab.value = '';
                return;
              }
            }
            //Add new entry
            $scope.shared.push(new shapy.browser.Permission(newEmail, $scope.write));
            // Clean
            $scope.write = true;
            $scope.newWrite();
            newCollab.value = '';
          };
          $scope.remove = function() {
            $scope.shared = goog.array.filter($scope.shared, function(permission) {
              return permission != $scope.selected;
            });
            $scope.selected = null;
          };
          //autocomplete
          $("#shared-with").autocomplete({
            source: available,
            default: 150
          });
          //Check availability
          $scope.isAvailable = function() {
            return goog.array.some($scope.available, function(email) {
              return email == document.getElementById('shared-with').value;
            });
          };
          // Handle permission selection
          $('#shared-with').bind('focus', function() {
            $scope.selected = null;
          });
          $scope.select = function(permission) {
            $scope.selected = permission;
          };
          $scope.whichSelected = function() {
            return $scope.selected;
          };
          // Handle permission type choosing for new collaborator
          $scope.newWrite = function() {
            if ($scope.write) {
               $("#new-write").css('color', 'gray');
               $("#new-write").css('font-weight', 'normal');
               $scope.write = false;
            } else {
              $("#new-write").css('color', 'black');
              $("#new-write").css('font-weight', 'bold');
              $scope.write = true;
            }
          };

        }
      });

    }, this));
  };

  return {
    restrict: 'E',
    scope: {
     asset: '='
    },
    link: function($scope, $elem, $attrs) {

      $elem.bind('mousedown', function(evt) {
          // Block if not owner
          if (!$scope.asset.owner) {
            return;
          }
          share($scope.asset);
      });
    }
  };

};



/**
 * Checks if asset name contains search query.
 *
 * @return {Function}
 */
shapy.browser.assetMatch = function() {
  return function(assets, pattern) {
    return goog.array.filter(assets, function(asset) {
      return goog.string.contains(asset.name, pattern);
    });
  };
};



/**
 * Orders asset by type and alphabetically within type.
 *
 * @return {Function}
 */
shapy.browser.assetOrder = function() {
  return function(assets) {
    return assets.sort(function(asset1, asset2) {
      if (asset1.type == asset2.type) {
        return asset1.name.localeCompare(asset2.name);
      }
      if (asset1.type == shapy.browser.Asset.Type.DIRECTORY) {
        return -1;
      }
      if (asset2.type == shapy.browser.Asset.Type.DIRECTORY) {
        return 1;
      }
      return asset1.name.localeCompare(asset2.name);
    });
  };
};



/**
 * Filters out the directories.
 *
 * @return {Function}
 */
shapy.browser.directories = function() {
  return function(assets) {
    return goog.array.filter(assets, function(asset) {
      return asset.type == shapy.browser.Asset.Type.DIRECTORY;
    });
  };
};

