// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.notification.Service');
goog.provide('shapy.notification.notifyBar');



/**
 * Notification service, brokers messages between the display and clients.
 *
 * @constructor
 *
 * @param {!angular.$timeout} $timeout
 */
shapy.notification.Service = function($timeout) {
  /**
   * Angular timeout service.
   * @private {!angular.$timeout} @const
   */
  this.timeout_ = $timeout;

  /**
   * List of notifications.
   */
  this.notifications = [];
};


/**
 * Adds a new notification.
 *
 * @private
 *
 * @param {!shapy.notification.Type_} type Type of the notification.
 * @param {Object}                    data
 *
 * @return {Function}
 */
shapy.notification.Service.prototype.add_ = function(type, data) {
  var item = new shapy.notification.Notification_(type, data);
  this.notifications.push(item);
  if (data.dismiss > 0) {
    this.timeout_(goog.bind(function() {
      item.fade = true;
      this.timeout_(goog.bind(function() {
        this.remove(item);
      }, this), 1000);
    }, this), data.dismiss);
  }
  return goog.bind(function() {
    item.fade = true;
    this.timeout_(goog.bind(function() {
      this.remove(item);
    }, this), 2000);
  }, this);
};


/**
 * Removes a notification.
 *
 * @param {!shapy.notification.Notification} notif Notification to be removed.
 *
 * @return {Function}
 */
shapy.notification.Service.prototype.remove = function(notif) {
  return this.notifications.splice(this.notifications.indexOf(notif), 1);
};


/**
 * Adds a new notice.
 *
 * @param {Object} data
 *
 * @return {Function}
 */
shapy.notification.Service.prototype.warning = function(data) {
  return this.add_(shapy.notification.Type_.WARNING, data);
};



/**
 * Adds a new error.
 *
 * @param {Object} data
 *
 * @return {Function}
 */
shapy.notification.Service.prototype.error = function(data) {
  return this.add_(shapy.notification.Type_.ERROR, data);
};


/**
 * Adds a new notice.
 *
 * @param {Object} data
 *
 * @return {Function}
 */
shapy.notification.Service.prototype.notice = function(data) {
  return this.add_(shapy.notification.Type_.NOTICE, data);
};



/**
 * Object containing information about a notification.
 *
 * @constructor
 * @private
 *
 * @param {shapy.Notification.Type_} type Type of the notification.
 * @param {Object} data
 */
shapy.notification.Notification_ = function(type, data) {
  /**
   * Type of the notification.
   * @public {shapy.notification.Type_} @const
   */
  this.type = type;

  /**
   * Link to show on the notification.
   * @public {string} @const
   */
  this.link = data.link;

  /**
   * Text to display.
   * @public {string} @const
   */
  this.text = data.text || 'Missing text';

  /**
   * Callback on click.
   * @public {Function} @const
   */
  this.click = data.click || null;

  /**
   * True if a cancel button is shown.
   * @public {boolean} @const
   */
  this.dismiss = data.dismiss || false;

  /**
   * True if the animation is being removed, fading out.
   * @public {boolean}
   */
  this.fade = false;
};



/**
 * Enumeration of notification types.
 *
 * @private
 * @enum {string}
 */
shapy.notification.Type_ = {
  WARNING: 'warning',
  ERROR: 'error',
  NOTICE: 'notice'
};



/**
 * Controller for the notification display.
 *
 * @constructor
 *
 * @private
 *
 * @param {shapy.notification.Service} shNotify  Angular notification service.
 * @param {!angular.$location}         $location Angular location service.
 */
shapy.notification.Controller_ = function(shNotify, $location) {
  /**
   * Angular location service.
   * @private {!angular.$location}
   * @const
   */
  this.location_ = $location;

  /**
   * Notification service.
   * @private {!shapy.notification.Service}
   * @const
   */
  this.shNotify_ = shNotify;

  /**
   * List of notifications to display.
   * @public {!Array<!shapy.notification.Notification_>}
   * @expose
   * @const
   */
  this.notifications = shNotify.notifications;
};


/**
 * Redirects to the notification link.
 *
 * @param {!shapy.notification.Notification_} notif Notification to follow.
 */
shapy.notification.Controller_.prototype.click = function(notif) {
  this.shNotify_.remove(notif);
  this.location_.path(notif.link);
};


/**
 * Dismisses a notification.
 *
 * @param {!shapy.notification.Notification_} notif Notification to hide.
 */
shapy.notification.Controller_.prototype.dismiss = function(notif) {
  this.shNotify_.remove(notif);
};



/**
 * Notification bar directive, displays stuff.
 *
 * @return {!angular.Directive}
 */
shapy.notification.notifyBar = function() {
  return {
    restrict: 'E',
    template:
      '<div ng-show="notifyCtrl.notifications">' +
        '<div '+
            'ng-repeat="notif in notifyCtrl.notifications" '+
            'class="notification">' +
          '<span class="{{ notif.type }}" ng-class="{ fade: notif.fade }" >' +
            '<a ' +
              'class="content"' +
              'ng-show="notif.link" ' +
              'ng-click="notifyCtrl.click(notif)">' +
                '{{ notif.text }}' +
            '</a>' +
            '<span ' +
              'class="content"' +
              'ng-hide="notif.link" ' +
              'ng-click="notifyCtrl.dismiss(notif)">' +
                '{{ notif.text }}' +
            '</span>' +
          '</span>' +
        '</div>' +
      '</div>',
    controllerAs: 'notifyCtrl',
    controller: shapy.notification.Controller_
  };
};
