// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.main.module');



/**
 * @constructor
 */
shapy.main.MainController = function() {
};



/**
 * @public {Object}
 * @const
 */
shapy.main.module = angular
  .module('shMain', [])
  .controller('MainController', shapy.main.MainController);
