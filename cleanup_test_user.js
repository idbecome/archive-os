import db from './server/db.js';

db.run("DELETE FROM users WHERE username LIKE 'test_auth_%'", [], function (err) {
    if (err) console.error(err);
    else console.log(`Deleted ${this.changes} test users.`);
    process.exit(0);
});
