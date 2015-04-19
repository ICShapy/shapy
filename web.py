#!/usr/bin/env python2

import os
import sys
import tornado.httpserver
import tornado.ioloop
import tornado.web
import shapy.editor
import shapy.user



PORT = int(os.environ.get('PORT', 8000))
FB_API_KEY = os.environ.get('FB_API_KEY')
FB_SECRET = os.environ.get('FB_SECRET')



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
  tornado.web.Application([
    # API handlers.
    (r'/api/user/auth',     shapy.user.AuthHandler),
    (r'/api/user/login',    shapy.user.LoginHandler),
    (r'/api/user/logout',   shapy.user.LogoutHandler),
    (r'/api/user/register', shapy.user.RegisterHandler),
    (r'/api/sock',          shapy.editor.WSHandler),

    # Static files.
    (r'/css/(.*)',  tornado.web.StaticFileHandler, { 'path': 'client/css' }),
    (r'/js/(.*)',   tornado.web.StaticFileHandler, { 'path': 'client/js' }),
    (r'/html/(.*)', tornado.web.StaticFileHandler, { 'path': 'client/html' }),
    (r'(.*)',       IndexHandler, { 'path': 'client/index.html' }),
  ], debug=True).listen(PORT)
  tornado.ioloop.IOLoop.instance().start()



if __name__ == '__main__':
  main(sys.argv)
