import express from 'express';
import register from './controllers/register/register';

const app = express();

app.use(express.json());



app.use('/register', register);


app.listen(3000, () => {
    console.log('Servidor corriendo por el puerto 3000');
});