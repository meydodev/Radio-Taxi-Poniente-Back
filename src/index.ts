import express from 'express';
import register from './controllers/register/register';
import login from './controllers/login/login';
import cors from 'cors';

const app = express();
app.use(cors({
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'] 
  }));

app.use(express.json());


app.use('/login', login);
app.use('/register', register);

app.listen(3000, () => {
    console.log('Servidor corriendo por el puerto 3000');
});