// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.browser.module');


/**
 * Controller for the asset browser.
 */
shapy.browser.BrowserController = function() {
};



/**
 * @public {!angular.Module}
 * @const
 */
shapy.browser.module = angular
  .module('shBrowser', [])
  .controller('BrowserController', shapy.browser.BrowserController);