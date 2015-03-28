#!/usr/bin/env python2

import os
import sys
import tornado.httpserver
import tornado.ioloop
import tornado.web


# Port number of the HTTP server.
PORT = int(os.environ.get('PORT', 8000))


def main(args):
  """Entry point of the application.

  Args:
    args: Command line arguments.
  """
  tornado.web.Application(
    [ ( r'/index.html'
      , tornado.web.StaticFileHandler
      , { 'path': 'static/index.html' }
      )
    , ( r'/favicon.ico'
      , tornado.web.StaticFileHandler
      , { 'path': 'static/favicon.ico' }
      )
    , ( r'/static/(.*)'
      , tornado.web.StaticFileHandler
      , { 'path': 'static' }
      )
    ]).listen(PORT)
  tornado.ioloop.IOLoop.instance().start()
    


if __name__ == '__main__':
  main(sys.argv)
