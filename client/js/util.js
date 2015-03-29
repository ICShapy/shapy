// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.api');



/**
 * Prefix of the API.
 * 
 * @private {string}
 * @const
 */
shapy.API_PREFIX_ = '/api/';



/**
 * Constructs a URL to an API handle.
 * 
 * @param {string} api Api method.
 *
 * @return {string} Final URL.
 */
shapy.api = function(api) {
  return shapy.API_PREFIX_ + api;
};


