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
    host: 'bhkq4ktdt8hu8why4ffk-mysql.services.clever-cloud.com', // Host de Clever Cloud
    user: 'uc7nsrkdmz5abri9', // Usuario
    password: 'j1kJ3RAOsRfCCC5pqCem', // Contraseña
    database: 'bhkq4ktdt8hu8why4ffk', // Nombre de la base de datos
    port: 3306, // Puerto
});





export default connection;