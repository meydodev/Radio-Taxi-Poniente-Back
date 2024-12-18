import mysql from 'mysql2'

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'radio_taxi_poniente',
});

export default connection;