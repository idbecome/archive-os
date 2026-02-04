
import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

connection.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});

connection.query('DELETE FROM roles', (error, results) => {
    if (error) console.error(error);
    else console.log('Deleted all roles. Rows affected:', results.affectedRows);
    connection.end();
});
