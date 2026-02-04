
import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'archive_os'
});

connection.connect(err => {
    if (err) {
        console.error('An error occurred while connecting to the DB');
        throw err;
    }
    console.log('Connected to MySQL');
});

connection.query('SELECT * FROM roles', (error, results, fields) => {
    if (error) {
        console.error(error);
    } else {
        console.log('ROLES:', results);
    }
    connection.end();
});
