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



def main(args):
  """Entry point of the application.

  Args:
    args: Command line arguments.
  """
  tornado.web.Application([
    (r'/api/sock',    WSHandler),
    (r'/api/(.*)',    APIHandler),
    (r'/static/(.*)', tornado.web.StaticFileHandler, { 'path': 'static' }),
    (r'/',            tornado.web.RedirectHandler, { 'url':  '/index.html' }),  
    (r'/(.*)',        tornado.web.StaticFileHandler, { 'path': 'static' }),
  ]).listen(PORT)
  tornado.ioloop.IOLoop.instance().start()
    


if __name__ == '__main__':
  main(sys.argv)
