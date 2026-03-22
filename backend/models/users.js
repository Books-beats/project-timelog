const db = require('./index');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

function createUser(email, password) {
  return bcrypt.hash(password, SALT_ROUNDS).then(hash =>
    db.one('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email', [email, hash])
  );
}

function findUserByEmail(email) {
  return db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
}

module.exports = { createUser, findUserByEmail };
