const pgp = require("pg-promise")(/* options */);
const db = pgp(
  "postgres://timelogger_user:asdfghjkl@localhost:5432/timelogger"
);

module.exports = db;
