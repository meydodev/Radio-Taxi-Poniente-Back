import mysql from 'mysql2'

/*
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'radio_taxi_poniente',
});
*/
const connection = mysql.createConnection({
    host: 'bhkq4ktdt8hu8why4ffk-mysql.services.clever-cloud.com',
    user: 'uc7nsrkdmz5abri9',
    password: 'j1kJ3RAOsRfCCC5pqCem',
    database: 'bhkq4ktdt8hu8why4ffk',
});


export default connection;