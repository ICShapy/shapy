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
goog.provide('shapy.browser.createTexture');
goog.provide('shapy.browser.delete');
goog.provide('shapy.browser.public');
goog.provide('shapy.browser.sidebar');
goog.provide('shapy.browser.share');
goog.provide('shapy.browser.upload');
goog.provide('shapy.browser.pathAsset');

goog.require('shapy.browser.Asset');
goog.require('shapy.browser.Directory');
goog.require('shapy.browser.Scene');
goog.require('shapy.browser.Texture');



/**
 * Controller for the asset browser.
 *
 * @constructor
 *
 * @param {!angular.$state}          $state    The angular state service.
 * @param {!angular.$http}           $http     The angular $http service.
 * @param {!shapy.browser.Service}   shBrowser The browser service.
 * @param {!shapy.browser.Directory} home      The home directory.
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
   * @public {!shapy.browser.Directory}
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
    case shapy.browser.Asset.Type.TEXTURE:
      this.shBrowser_.renameTexture(asset, name);
      break;
    default :
      console.log('rename - unimplemented case!');
  }
};


/**
 * Returns the current directory.
 *
 * @return {!shapy.browser.Directory}
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
 * @return {!shapy.browser.Directory}
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
};


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
 * @param {!shapy.browser.Directory} dir Dir chosen by user.
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
            case shapy.browser.Asset.Type.TEXTURE:
              asset.shBrowser_.deleteTexture(asset);
              break;
            default:
              console.log('deleting - unimplemented case!');
          }
        };
      }
    });
  };

  /**
   * Handles displaying a texture in full size.
   * @param {!shapy.browser.Asset} asset
   */
  var displayTexture = function(asset) {
    shModal.open({
      size: 'large',
      title: 'Texture',
      template:
          '<img id="texture-display" ng-src="{{asset.imageFull}}">',
      controller: function($scope) {
        $scope.asset = asset;
        $scope.cancel = function() { return false; };
        $scope.okay = function() { return false; };
      }
    });
  };

  return {
    restrict: 'E',
    scope: {
      asset: '=',
      selected: '=',
      owner: '=',
      selectAsset: '&'
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

      // Select or display texture
      $elem.bind('dblclick', function(evt) {
        // Block if the dbclick did not select asset i.e. icon not clicked
        if ($scope.asset != $scope.selected) {
          return;
        }

        if ($scope.asset.type != shapy.browser.Asset.Type.TEXTURE) {
          $scope.selectAsset({asset: $scope.asset, enter: true});
          return;
        } else {
          $scope.asset.shBrowser_.getTexture($scope.asset.id).then(function() {
            displayTexture($scope.asset);
          });
        }
      });

      // Drag handling - changing parent dir

      $elem
        .on('dragover', function(e) {
          var evt = e.originalEvent;
          e.preventDefault();
          e.stopPropagation();
          $(this).addClass('drag-over');
          evt.dataTransfer.dropEffect = 'move';
          return false;
        })
        .on('dragenter', function(e) {
          $(this).addClass('drag-over');
          return true;
        })
        .on('dragleave', function(e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass('drag-over');
          return true;
        })
        .on('dragstart', function(e) {
          var evt = e.originalEvent;
          if (!$scope.asset.owner) {
            return;
          }
          evt.dataTransfer.setData('asset', $scope.asset.id);
          evt.dataTransfer.setDragImage(e.target, 10, 10);
          return true;
        })
        .on('drop', function(e) {
          var id = parseInt(e.originalEvent.dataTransfer.getData('asset'), 10);
          $scope.asset.shBrowser_.move($scope.asset, id);
          e.preventDefault();
          e.stopPropagation();
          $('sh-asset').removeClass('drag-over');
          return false;
        });
    }
  };
};



/**
 * Deleting directive.
 *
 * @param {!shapy.modal.Service}       shModal
 *
 * @return {!angular.Directive}
 */
shapy.browser.delete = function(shModal) {
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
            case shapy.browser.Asset.Type.TEXTURE:
              asset.shBrowser_.deleteTexture(asset);
              break;
            default:
              console.log('deleting - unimplemented case!');
          }
        };
      }
    });
  };

  return {
    restrict: 'E',
    scope: {
      asset: '=',
    },
    link: function($scope, $elem) {
      $elem.bind('mousedown', function(evt) {
          // Block if not owner
          if (!$scope.asset.owner) {
            return;
          }
          doDelete($scope.asset);
      });
    }
  };

};



/**
 * Sharing directive.
 *
 * @param {!shapy.modal.Service}       shModal
 * @param {!shapy.browser.Service}     shBrowser
 * @param {!shapy.UserService}         shUser
 *
 * @return {!angular.Directive}
 */
shapy.browser.share = function(shModal, shBrowser, shUser) {
  /**
   * Handles sharing of an asset.
   *
   * @param {!shapy.browser.Asset}             asset
   * @param {!Array<string>}                   emails
   * @param {!Array<shapy.browser.Permission>} permissions
   */
  var share = function(asset, permissions) {
    shModal.open({
      size: 'medium',
      title: 'Share Asset',
      templateUrl: '/html/browser-permissions.html',
      controller: function($scope) {
        var emails = {};

        $scope.asset = asset;
        $scope.permissions = permissions;

        // Closes the dialog.
        $scope.cancel = function() {
          return false;
        };

        // Applies permissions.
        $scope.okay = function() {
          shBrowser.setPermissions($scope.asset, $scope.permissions);
        };

        // Adds a new permission.
        $scope.add = function() {
          var duplicate = goog.array.some($scope.permissions, function(perm) {
            return perm.email == $scope.newEmail;
          });
          if (!$scope.checkEmail() || duplicate) {
            return;
          }

          // Add a new permission entry.
          $scope.permissions.push(new shapy.browser.Permission(
            emails[$scope.newEmail].id, $scope.newEmail, false
          ));
          $scope.newEmail = '';
        };

        var onApply = function(e, ui) {
          $scope.$apply(goog.bind(function() {
            $scope.newEmail = ui.item.value;
          }, this));
        };

        // Autocomplete.
        $('.share-new-email').autocomplete({
          source: function(request, response) {
            if (!request.term) {
              response([]);
              return;
            }
            shUser.filter(request.term)
              .then(function(users) {
                response(goog.array.map(
                  goog.array.filter(users, function(user) {
                    emails[user.email] = user;
                    return user.id != $scope.asset.owner_id;
                  }), function(user) {
                    return user.email;
                  }));
              }, function() {
                response([]);
              });
          },
          change: onApply,
          select: onApply
        });

        // Check availability.
        $scope.checkEmail = function() {
          return goog.object.some(emails, function(user) {
            return user.email == $scope.newEmail;
          });
        };
      }
    });
  };

  return {
    restrict: 'E',
    scope: {
     asset: '='
    },
    link: function($scope, $elem, $attrs) {
      $elem.bind('mousedown', function(evt) {
        var asset = $scope.asset;
        // Block if not owner.
        if (!asset.owner) {
          return;
        }
        shBrowser.getPermissions(asset).then(function(permissions) {
          share(asset, permissions);
        });
      });
    }
  };
};



/**
 * Public setting directive.
 *
 * @param {!shapy.browser.Service}     shBrowser
 *
 * @return {!angular.Directive}
 */
shapy.browser.public = function(shBrowser) {
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
          switch($scope.asset.type) {
            case shapy.browser.Asset.Type.SCENE:
              shBrowser.setPublicScene($scope.asset, !$scope.asset.public);
              break;
            case shapy.browser.Asset.Type.TEXTURE:
              shBrowser.setPublicTexture($scope.asset, !$scope.asset.public);
              break;
            default:
              console.log('making public - unimplemented case!');
          }
      });
    }
  };

};


/**
 * Texture creating directive.
 *
 * @param {!shapy.modal.Service}       shModal
 *
 * @return {!angular.Directive}
 */
shapy.browser.createTexture = function(shModal, shNotify, shBrowser) {
  /**
   * Handles creating/uploading texture.
   */
  var createTexture = function() {
    shModal.open({
      size: 'medium',
      title: 'Create Texture',
      controllerAs: 'uploadCtrl',
      templateUrl: '/html/browser-create-texture.html',
      controller: function($scope) {
        /**
         * List of files.
         */
        $scope.files = [];

        // Add files chosen via input element
        $("#files-manual").bind('change', function(evt) {
          var file;
          var newFiles = evt.target.files;
          $scope.$apply(function() {
            for (var i = 0; file = newFiles[i]; i++) {
              // Add file if it passes checks
              if (file.type != 'image/jpeg' && file.type != 'image/png') {
                shNotify.error({
                  text: 'Only accepted types are jpeg and png.',
                  dismiss: 5000
                });
              } else if (file.size > 4*1024*1024) {
                shNotify.error({
                  text: 'File size over 4MB.',
                  dismiss: 5000
                });
              } else {
                $scope.files.push(file);
              }
            }
          });
        });

        //Delegate click to actual input element
        $(".button-choose").bind('click', function(evt) {
          $("#files-manual").trigger('click');
          $(".button-choose").trigger('blur');
        });


        // Cancels the upload.
        $scope.cancel = function() { return false; };

        // Starts the upload.
        $scope.okay = function() {
          for (var i = 0; i < $scope.files.length; i++) {
            var reader = new FileReader();
            reader.onload = goog.bind(function(name, reader) {
              shBrowser.createTexture(name, reader.result);
            }, this, $scope.files[i].name, reader);
            reader.readAsDataURL($scope.files[i]);
          }
        };
      }
    });
  };

  return {
    restrict: 'E',
    link: function($scope, $elem) {
      $elem.bind('mousedown', createTexture);
    }
  };
};


/**
 * Upload directive.
 *
 * @param {!shapy.notification.Service} shNotify
 *
 * @return {!angular.Directive}
 */
shapy.browser.upload = function(shNotify) {
  return {
    restrict: 'E',
    scope: {
     filesUpload: '='
    },
    link: function($scope, $elem, $attrs) {
      $elem
        .on('dragover', function(e) {
          e.preventDefault();
          e.stopPropagation();

          $('.upload-choose').hide();
          $elem.addClass('hover');
        })
        .on('dragleave', function(e) {
          e.preventDefault();
          e.stopPropagation();

          $('.upload-choose').show();
          $elem.removeClass('hover');
        })
        .on('drop', function(e) {
          // Add files chosen via drop
          var newFiles = e.originalEvent.dataTransfer.files;
          var file;
          $scope.$apply(function() {
            for (var i = 0; file = newFiles[i]; i++) {
              // Add file if it passes checks
              if (file.type != 'image/jpeg' && file.type != 'image/png') {
                shNotify.error({
                  text: 'Only accepted types are jpeg and png.',
                  dismiss: 5000
                });
              } else if (file.size > 4 * 1024 * 1024) {
                shNotify.error({
                  text: 'File size over 4MB.',
                  dismiss: 5000
                });
              } else {
                $scope.filesUpload.push(file);
              }
            }
          });

          $('.upload-choose').show();
          $elem.removeClass('hover');

          e.preventDefault();
          e.stopPropagation();

          return false;
        });
    }
  };
};



/**
 * Path asset directive
 */
shapy.browser.pathAsset = function() {
  return {
    restrict: 'E',
    scope: {
     dir: '='
    },
    link: function($scope, $elem, $attrs) {
      $elem
        .on('dragover', function(e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).addClass('drag-over');
          return false;
        })
        .on('dragleave', function(e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass('drag-over');
          return true;
        })
        .on('drop', function(e) {
          var id = parseInt(e.originalEvent.dataTransfer.getData('asset'), 10);
          $scope.dir.shBrowser_.move($scope.dir, id);
          e.preventDefault();
          e.stopPropagation();
          $('sh-path-asset').removeClass('drag-over');
          return false;
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

