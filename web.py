#!/usr/bin/env python2

import os
import sys

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornadoredis

import psycopg2
import momoko

import shapy.editor
import shapy.user



# HTTP port.
PORT = int(os.environ.get('PORT', 8000))

# PostgreSQL connection.
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_NAME = os.environ.get('DB_NAME', 'shapy')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PORT = int(os.environ.get('DB_PORT', 5432))
DB_PASS = os.environ.get('DB_PASS', '')

# Redis connection.
RD_HOST = os.environ.get('RD_HOST', 'localhost')
RD_PORT = int(os.environ.get('RD_PORT', 7759))
RD_PASS = os.environ.get('RD_PASS', '')

# Facebook API.
FB_API_KEY = os.environ.get('FB_API_KEY')
FB_SECRET = os.environ.get('FB_SECRET')

# Very secret cookie secret.
COOKIE_SECRET = os.environ.get('COOKIE_SECRET')



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
    # API handlers.
    (r'/api/user/auth',             shapy.user.AuthHandler),
    (r'/api/user/login',            shapy.user.LoginHandler),
    (r'/api/user/logout',           shapy.user.LogoutHandler),
    (r'/api/user/register',         shapy.user.RegisterHandler),
    (r'/api/edit/([0-9]+@[0-9]+)',  shapy.editor.WSHandler),
    (r'/api/scene/([0-9]+@[0-9]+)', shapy.editor.SceneHandler),

    # Static files.
    (r'/css/(.*)',  tornado.web.StaticFileHandler, { 'path': 'client/css' }),
    (r'/js/(.*)',   tornado.web.StaticFileHandler, { 'path': 'client/js' }),
    (r'/html/(.*)', tornado.web.StaticFileHandler, { 'path': 'client/html' }),
    (r'(.*)',       IndexHandler, { 'path': 'client/index.html' }),
  ], debug=True, cookie_secret=COOKIE_SECRET)

  # Connect to the database.
  app.db = momoko.Pool(
      dsn='dbname=%s user=%s password=%s host=%s port=%d' %
          (DB_NAME, DB_USER, DB_PASS, DB_HOST, DB_PORT),
      size=1)

  # Connect to redis.
  app.redis_pool = tornadoredis.ConnectionPool(
      host=RD_HOST,
      port=RD_PORT,
      password=RD_PASS,
      max_connections=10,
      wait_for_available=True)

  # Start the server.
  tornado.httpserver.HTTPServer(app).listen(PORT)
  tornado.ioloop.IOLoop.instance().start()



if __name__ == '__main__':
  main(sys.argv)
