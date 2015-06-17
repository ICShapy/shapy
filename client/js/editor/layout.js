// This file is part of the Shapy project.
// Licensing information can be found in the LICENSE file.
// (C) 2015 The Shapy Team. All rights reserved.
goog.provide('shapy.editor.Layout');
goog.provide('shapy.editor.Layout.Double');
goog.provide('shapy.editor.Layout.Quad');
goog.provide('shapy.editor.Layout.Single');

goog.require('goog.math.Size');
goog.require('goog.math.Vec2');
goog.require('shapy.editor.Viewport.Edit');
goog.require('shapy.editor.Viewport.UV');



/**
 * Class that manages the layout of multiple viewports on the screen.
 *
 * @constructor
 *
 * @param {!shapy.editor.Editor}                   editor    Editor service.
 * @param {!Object<string, shapy.editor.Viewport>} viewports Map of viewports.
 */
shapy.editor.Layout = function(editor, viewports) {
  /** @public {!shapy.editor.Editor} @const */
  this.editor = editor;
  /** @public {!Object<string, shapy.editor.Viewport>} @const */
  this.viewports = viewports;

  /**
   * The size of the entire screen.
   * @protected {!goog.math.Size}
   * @const
   */
  this.size = new goog.math.Size(0, 0);

  /**
   * Pointer to the active viewport.
   * @public {!shapy.editor.Viewport}
   */
  this.hover = goog.object.getAnyValue(this.viewports);

  /**
   * Active viewport receiving keyboard events.
   * @public {!shapy.editor.Viewport}
   */
  this.active = this.hover;
  this.active.active = true;
};


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} w Width of the screen.
 * @param {number} h Height of the screen.
 */
shapy.editor.Layout.prototype.resize = function(w, h) {
  this.size.width = w;
  this.size.height = h;
};


/**
 * Finds out which viewport is touched by the mouse.
 *
 * @private
 *
 * @param {number} x Mouse X position.
 * @param {number} y Mouse Y position.
 *
 * @return {?{ vp: shapy.editor.Viewport, x: number, y: number }}
 */
shapy.editor.Layout.prototype.getViewport_ = function(x, y) {
  for (var name in this.viewports) {
    if (!this.viewports.hasOwnProperty(name)) {
      continue;
    }
    var vp = this.viewports[name];
    if (x < vp.rect.x || vp.rect.x + vp.rect.w < x) {
      continue;
    }
    if (y < vp.rect.y || vp.rect.y + vp.rect.h < y) {
      continue;
    }
    return {
      vp: vp,
      x: x - vp.rect.x,
      y: y - vp.rect.y
    };
  }
  return null;
};


/**
 * Closes all UV view.s
 */
shapy.editor.Layout.prototype.closeUV = function() {
  this.viewports = goog.object.map(this.viewports, function(vp, vpName) {
    if (vp.type != shapy.editor.Viewport.Type.UV) {
      return vp;
    }
    this[vpName] = new shapy.editor.Viewport.Edit(this.editor, vpName);
    if (this.active.name == vpName) {
      this.active = this[vpName];
      this.active.active = true;
    }
    return this[vpName];
  }, this);
  this.resize(this.size.width, this.size.height);
};


/**
 * Changes a viewport to UV mode.
 */
shapy.editor.Layout.prototype.toggleUV = function() {
  var name = this.active.name;

  if (this.active.type == shapy.editor.Viewport.Type.UV) {
    this[name] = new shapy.editor.Viewport.Edit(this.editor, name);
    this.viewports[name] = this[name];
  } else {
    this.viewports = goog.object.map(this.viewports, function(vp, vpName) {
      if (vpName != name && vp.type != shapy.editor.Viewport.Type.UV) {
        return vp;
      }
      if (vpName != name) {
        this[vpName] = new shapy.editor.Viewport.Edit(this.editor, vpName);
      } else {
        this[vpName] = new shapy.editor.Viewport.UV(this.editor, vpName);
      }
      return this[vpName];
    }, this);
  }

  this.active = this.hover = this[name];
  this.active.active = true;

  this.resize(this.size.width, this.size.height);
};


/**
 * Handles a key press.
 *
 * @param {KeyboardEvent} e
 */
shapy.editor.Layout.prototype.keyDown = function(e) {
  if (this.active) {
    this.active.keyDown(e);
  }
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.prototype.mouseMove = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || !result.vp) {
    return [];
  }

  if (this.hover && result.vp == this.hover) {
    return this.hover.mouseMove(result.x, result.y, e.which);
  }

  if (this.hover) {
    this.hover.mouseLeave();
  }

  this.hover = result.vp;
  this.hover.mouseEnter(result.x, result.y);
  return [];
};


/**
 * Handles a mouse press event.
 *
 * @param {MouseEvent} e Original event.
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.prototype.mouseDown = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || !result.vp) {
    return;
  }

  var ray = result.vp.mouseDown(
      result.x, result.y, e.which, e.ctrlKey || e.shiftKey);

  this.active.active = false;
  var rig = this.active.rig;
  this.active.rig = null;
  this.active = result.vp;
  if (this.active.type == shapy.editor.Viewport.Type.EDIT) {
    this.active.rig = rig;
  }
  this.active.active = true;

  return ray;
};


/**
 * Handles a mouse press event.
 *
 * @param {MouseEvent} e Original event.
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.prototype.mouseWheel = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || !result.vp) {
    return;
  }
  return result.vp.mouseWheel(e.originalEvent.wheelDelta);
};


/**
 * Handles a mouse release event.
 *
 * @param {MouseEvent} e
 *
 * @return {booblean} True if event was processed.
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.prototype.mouseUp = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || !result.vp) {
    return null;
  }

  return result.vp.mouseUp(result.x, result.y);
};


/**
 * Handles a mouse enter event.
 *
 * @param {MouseEvent} e
 */
shapy.editor.Layout.prototype.mouseEnter = function(e) {
  var result = this.getViewport_(e.offsetX, e.offsetY);
  if (!result || result.vp) {
    return;
  }

  this.hover = result.vp;
  this.hover.mouseEnter(result.x, result.y);
};


/**
 * Handles a mouse leave event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.prototype.mouseLeave = function(e) {
  if (!this.hover) {
    return;
  }

  var ray = this.hover.mouseLeave();
  this.hover = null;
  return ray;
};


/**
 * Creates a layout with a single viewport.
 *
 * @constructor
 * @extends {shapy.editor.Layout}
 *
 * @param {!shapy.editor.Editor} editor    Editor service.
 */
shapy.editor.Layout.Single = function(editor) {
  /** @public {!shapy.editor.Viewport} @const */
  this.viewport = new shapy.editor.Viewport.Edit(editor, 'viewport');

  shapy.editor.Layout.call(this, editor, {
      'viewport': this.viewport
  });
};
goog.inherits(shapy.editor.Layout.Single, shapy.editor.Layout);


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} w Width of the window.
 * @param {number} h Height of the window.
 */
shapy.editor.Layout.Single.prototype.resize = function(w, h) {
  shapy.editor.Layout.prototype.resize.call(this, w, h);
  this.viewport.resize(0, 0, w, h);
};



/**
 * Creates a layout by splitting the screen into 2 vertically.
 *
 * @constructor
 * @extends {shapy.editor.Layout}
 *
 * @param {!shapy.editor.Editor} editor    Editor service.
 */
shapy.editor.Layout.Double = function(editor) {
  /** @public {!shapy.editor.Viewport} @const */
  this.left = new shapy.editor.Viewport.Edit(editor, 'left');
  /** @public {!shapy.editor.Viewport} @const */
  this.right = new shapy.editor.Viewport.Edit(editor, 'right');

  /** @private {number} */
  this.split_ = 0.5;
  /** @private {number} */
  this.bar_ = 0;
  /** @private {boolean} */
  this.hover_ = false;
  /** @private {boolean} */
  this.resize_ = false;

  shapy.editor.Layout.call(this, editor, {
    'left': this.left,
    'right': this.right,
  });
};
goog.inherits(shapy.editor.Layout.Double, shapy.editor.Layout);


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} w Width of the window.
 * @param {number} h Height of the window.
 */
shapy.editor.Layout.Double.prototype.resize = function(w, h) {
  shapy.editor.Layout.prototype.resize.call(this, w, h);

  this.bar_ = w * this.split_;
  this.left.resize(0, 0, w * this.split_, h);
  this.right.resize(w * this.split_, 0, w * (1 - this.split_), h);
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.Double.prototype.mouseMove = function(e) {
  this.hover_ = Math.abs(e.offsetX - this.bar_) < 5;

  if (this.resize_) {
    this.split_ = e.offsetX / this.size.width;
    this.split_ = Math.max(0.1, Math.min(0.9, this.split_));
    this.resize(this.size.width, this.size.height);
  }

  if (this.hover_) {
    $('canvas').css('cursor', 'ew-resize');
    return [];
  } else {
    $('canvas').css('cursor', 'auto');
    return shapy.editor.Layout.prototype.mouseMove.call(this, e);
  }
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.Double.prototype.mouseDown = function(e) {
  this.resize_ = this.hover_;
  if (this.resize_) {
    return null;
  }
  return shapy.editor.Layout.prototype.mouseDown.call(this, e);
};


/**
 * Handles a mouse up event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.Double.prototype.mouseUp = function(e) {
  if (!this.resize_) {
    return shapy.editor.Layout.prototype.mouseUp.call(this, e);
  }
  this.hover_ = this.resize_ = false;
  return null;
};


/**
 * Handles a mouse leave event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.Double.prototype.mouseLeave = function(e) {
  if (!this.resize) {
    return shapy.editor.Layout.prototype.mouseLeave.call(this, e);
  }
  this.hover_ = this.resize_ = false;
  return null;
};



/**
 * Creates a layout by splitting the screen into 4 viewport.
 *
 * @constructor
 * @extends {shapy.editor.Layout}
 *
 * @param {!shapy.editor.Editor} editor    Editor service.
 */
shapy.editor.Layout.Quad = function(editor) {
  /** @public {!shapy.editor.Viewport} @const */
  this.topLeft = new shapy.editor.Viewport.Edit(editor, 'topLeft');
  /** @public {!shapy.editor.Viewport} @const */
  this.topRight = new shapy.editor.Viewport.Edit(editor, 'topRight');
  /** @public {!shapy.editor.Viewport} @const */
  this.bottomLeft = new shapy.editor.Viewport.Edit(editor, 'bottomLeft');
  /** @public {!shapy.editor.Viewport} @const */
  this.bottomRight = new shapy.editor.Viewport.Edit(editor, 'bottomRight');

  /** @private {number} */
  this.splitX_ = 0.5;
  /** @private {number} */
  this.barX_ = 0;
  /** @private {boolean} */
  this.hoverX_ = false;
  /** @private {boolean} */
  this.resizeX_ = false;

  /** @private {number} */
  this.splitY_ = 0.5;
  /** @private {number} */
  this.barY_ = 0;
  /** @private {boolean} */
  this.resizeY_ = false;
  /** @private {boolean} */
  this.hoverY_ = false;

  shapy.editor.Layout.call(this, editor, {
      'topLeft': this.topLeft,
      'topRight': this.topRight,
      'bottomLeft': this.bottomLeft,
      'bottomRight': this.bottomRight
  });
};
goog.inherits(shapy.editor.Layout.Quad, shapy.editor.Layout);


/**
 * Recomputes the positions & sizes of all viewports.
 *
 * @param {number} w Width of the window.
 * @param {number} h Height of the window.
 */
shapy.editor.Layout.Quad.prototype.resize = function(w, h) {
  shapy.editor.Layout.prototype.resize.call(this, w, h);

  this.barX_ = Math.floor(w * this.splitX_);
  this.barY_ = Math.floor(h * this.splitY_);

  this.topLeft.resize(
      0,
      0,
      this.barX_,
      this.barY_);
  this.topRight.resize(
      this.barX_,
      0,
      w - this.barX_,
      this.barY_);
  this.bottomLeft.resize(
      0,
      this.barY_,
      this.barX_,
      h - this.barY_);
  this.bottomRight.resize(
      this.barX_,
      this.barY_,
      w - this.barX_,
      h - this.barY_);
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.Quad.prototype.mouseMove = function(e) {
  this.hoverX_ = Math.abs(e.offsetX - this.barX_) < 5;
  this.hoverY_ = Math.abs(e.offsetY - this.barY_) < 5;

  if (this.resizeX_) {
    this.splitX_ = e.offsetX / this.size.width;
    this.splitX_ = Math.max(0.1, Math.min(0.9, this.splitX_));
  }
  if (this.resizeY_) {
    this.splitY_ = e.offsetY / this.size.height;
    this.splitY_ = Math.max(0.1, Math.min(0.9, this.splitY_));
  }

  if (this.resizeX_ || this.resizeY_) {
    this.resize(this.size.width, this.size.height);
  }

  if (this.hoverX_ && this.hoverY_) {
    $('canvas').css('cursor', 'move');
  } else if (this.hoverX_) {
    $('canvas').css('cursor', 'ew-resize');
  } else if (this.hoverY_) {
    $('canvas').css('cursor', 'ns-resize');
  } else {
    $('canvas').css('cursor', 'auto');
    return shapy.editor.Layout.prototype.mouseMove.call(this, e);
  }
  return [];
};


/**
 * Handles a mouse motion event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.Quad.prototype.mouseDown = function(e) {
  this.resizeX_ = this.hoverX_;
  this.resizeY_ = this.hoverY_;

  if (this.resizeX_ || this.resizeY_) {
    return null;
  }
  return shapy.editor.Layout.prototype.mouseDown.call(this, e);
};


/**
 * Handles a mouse up event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.Quad.prototype.mouseUp = function(e) {
  if (!this.resizeX_ && !this.resizeY_) {
    return shapy.editor.Layout.prototype.mouseUp.call(this, e);
  }
  this.hoverX_ = this.hoverY_ = this.resizeX_ = this.resizeY_ = false;
  return null;
};


/**
 * Handles a mouse leave event.
 *
 * @param {MouseEvent} e
 *
 * @return {goog.vec.Ray}
 */
shapy.editor.Layout.Quad.prototype.mouseLeave = function(e) {
  if (!this.resizeX_ && !this.resizeY_) {
    return shapy.editor.Layout.prototype.mouseLeave.call(this, e);
  }
  this.hoverX_ = this.hoverY_ = this.resizeX_ = this.resizeY_ = false;
  return null;
};

