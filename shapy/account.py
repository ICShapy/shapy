# This file is part of the Shapy Project.
# Licensing information can be found in the LICENSE file.
# (C) 2015 The Shapy Team. All rights reserved.

import momoko
from tornado.gen import Return, coroutine


class Account(object):
  """User account management."""

  @classmethod
  @coroutine
  def get(cls, db, user_id):
    """Fetched an account from the database."""

    cursor = yield momoko.Op(db.execute,
        '''SELECT first_name, last_name, email FROM users WHERE id=%s''',
        (user_id,))

    # Check if the user exists.
    user = cursor.fetchone()
    if not user:
      raise Return(None)

    # Build a wrapper object around the data.
    raise Return(Account(
        user_id,
        first_name=user[0],
        last_name=user[1],
        email=user[2]))

  @classmethod
  @coroutine
  def login(cls, db, account):
    """Logs a user in."""
    pass


  def __init__(self, user_id, first_name='', last_name='', email=''):
    """Initializes a new account object."""

    self.id = user_id
    self.first_name = first_name
    self.last_name = last_name
    self.email = email
