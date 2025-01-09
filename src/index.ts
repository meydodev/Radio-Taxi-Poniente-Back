import express from 'express';
import register from './controllers/register/register';
import login from './controllers/login/login';
import home from './controllers/home/home';
import profile from './controllers/profile/profile';
import channel1 from './controllers/channel1/channel1';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

const app = express();

// Configurar CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../dist/uploads')));

// Crear el servidor HTTP
const httpServer = app.listen(3000, () => {
    console.log('Servidor iniciado en http://localhost:3000');
});

// Configurar Socket.IO con el servidor HTTP
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true
    }
});

// Middleware para inyectar Socket.IO en `req`
app.use((req, res, next) => {
    (req as any).io = io; // Inyectar la instancia de io en req
    next();
});

// Rutas
app.use('/login', login);
app.use('/register', register);
app.use('/home', home);
app.use('/profile', profile);
app.use('/channel1', channel1);

// Eventos de Socket.IO
io.on('connection', (socket) => {
    //console.log('Cliente conectado a Socket.IO');

    socket.on('disconnect', () => {
       // console.log('Cliente desconectado de Socket.IO');
    });
});
