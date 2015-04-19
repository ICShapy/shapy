#!/usr/bin/env python2

import os
import sys
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.websocket



PORT = int(os.environ.get('PORT', 8000))



class APIHandler(tornado.web.RequestHandler):
  """Handles requests to the REST API."""

  def get(self, url):
    """Handles a GET request."""
    self.write('get')

  def post(self, url):
    """Handles a POST request."""
    self.write('post')



class WSHandler(tornado.websocket.WebSocketHandler):
  """Handles websocket connections."""

  def open(self):
    """Handles an incoming connection."""
    pass

  def on_message(self, message):
    """Handles an incoming message."""
    pass

  def on_close(self, message):
    """Handles connection termination."""
    pass



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
    (r'/api/sock',    WSHandler),
    (r'/api/(.*)',    APIHandler),
    (r'/css/(.*)',    tornado.web.StaticFileHandler, { 'path': 'client/css' }),
    (r'/js/(.*)',     tornado.web.StaticFileHandler, { 'path': 'client/js' }),
    (r'/html/(.*)',   tornado.web.StaticFileHandler, { 'path': 'client/html' }),
    (r'(.*)',         IndexHandler, { 'path': 'client/index.html' }),
  ], debug=True).listen(PORT)
  tornado.ioloop.IOLoop.instance().start()



if __name__ == '__main__':
  main(sys.argv)
