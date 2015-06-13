#!/usr/bin/env python2

import os
import sys

import redis
import tornado.httpserver
import tornado.ioloop
import tornado.web

import psycopg2
import momoko

import shapy.editor
import shapy.user
import shapy.assets
import shapy.permissions
import shapy.public



class IndexHandler(tornado.web.StaticFileHandler):
  def initialize(self, path):
    self.dirname, self.filename = os.path.split(path)
    super(IndexHandler, self).initialize(self.dirname)

  def get(self, path=None, include_body=True):
    super(IndexHandler, self).get(self.filename, include_body)



def main(args):
  """Entry point of the application.

  Args:
    args: Command line arguments.
  """

  # Set up URL routes.
  app = tornado.web.Application([
    # API for accessing assets.
    (r'/api/assets/dir$',        shapy.assets.DirHandler),
    (r'/api/assets/filtered$',   shapy.assets.FilteredHandler),
    (r'/api/assets/public',      shapy.public.PublicHandler),
    (r'/api/assets/scene$',      shapy.assets.SceneHandler),
    (r'/api/assets/shared$',     shapy.assets.SharedHandler),
    (r'/api/assets/texture$',    shapy.assets.TextureHandler),
    (r'/api/assets/textures$',   shapy.assets.TextureFilterHandler),

    # Permissions
    (r'/api/permissions$',       shapy.permissions.PermissionsHandler),

    # Authentication.
    (r'/api/user/auth',          shapy.user.AuthHandler),
    (r'/api/user/auth/fb',       shapy.user.FacebookHandler),
    (r'/api/user/auth/gp',       shapy.user.GoogleHandler),
    (r'/api/user/check/([^/]+)', shapy.user.CheckHandler),
    (r'/api/user/login',         shapy.user.LoginHandler),
    (r'/api/user/logout',        shapy.user.LogoutHandler),
    (r'/api/user/register',      shapy.user.RegisterHandler),
    (r'/api/user/([0-9]+)',      shapy.user.InfoHandler),

    # WebSocket handler.
    (r'/api/edit/([0-9]+)',      shapy.editor.WSHandler),

    # Static files.
    (r'/css/(.*)',  tornado.web.StaticFileHandler, { 'path': 'client/css' }),
    (r'/js/(.*)',   tornado.web.StaticFileHandler, { 'path': 'client/js' }),
    (r'/html/(.*)', tornado.web.StaticFileHandler, { 'path': 'client/html' }),
    (r'/img/(.*)',  tornado.web.StaticFileHandler, { 'path': 'client/img' }),
    (r'(.*)',       IndexHandler, { 'path': 'client/index.html' }),
  ],
    debug=True,
    cookie_secret=os.environ.get('COOKIE_SECRET'),
    facebook_api_key=os.environ.get('FB_API_KEY'),
    facebook_secret=os.environ.get('FB_SECRET'),
    google_oauth={
      'key': os.environ.get('GOOGLE_CLIENT'),
      'secret': os.environ.get('GOOGLE_SECRET')
    }
  )

  # Read configuration.
  app.DB_HOST = os.environ.get('DB_HOST', 'localhost')
  app.DB_NAME = os.environ.get('DB_NAME', 'shapy')
  app.DB_USER = os.environ.get('DB_USER', 'postgres')
  app.DB_PORT = int(os.environ.get('DB_PORT', 5432))
  app.DB_PASS = os.environ.get('DB_PASS', '')

  app.RD_HOST = os.environ.get('RD_HOST', 'localhost')
  app.RD_PORT = int(os.environ.get('RD_PORT', 7759))
  app.RD_PASS = os.environ.get('RD_PASS', '')

  # Connect to the postgresql database.
  app.db = momoko.Pool(
      cursor_factory=psycopg2.extras.DictCursor,
      dsn='dbname=%s user=%s password=%s host=%s port=%d' %
          (app.DB_NAME, app.DB_USER, app.DB_PASS, app.DB_HOST, app.DB_PORT),
      size=1)

  # Connect to the redis server.
  app.redis = redis.Redis(
      host=app.RD_HOST,
      port=app.RD_PORT,
      password=app.RD_PASS)

  # Start the server.
  tornado.httpserver.HTTPServer(app).listen(int(os.environ.get('PORT', 8000)))
  tornado.ioloop.IOLoop.instance().start()



if __name__ == '__main__':
  main(sys.argv)
