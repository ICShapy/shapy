# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import hashlib
import json

import momoko
from tornado.gen import coroutine
from tornado.web import HTTPError



class ListAssetsHandler():
  """Handles requests to the REST API."""

  @coroutine
  def get(self, assetNumber):
    # check permissions for asset
    # return array of assets for a directory asset
    pass