import express from 'express';
import register from './controllers/register/register';
import login from './controllers/login/login';
import home from './controllers/home/home';
import channel1 from './controllers/channel1/channel1';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const server = http.createServer(app);

const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true
    }
});

app.use((req, res, next) => {
    (req as any).io = io; // Inyectar la instancia de io en req
    next();
});

app.use('/login', login);
app.use('/register', register);
app.use('/home', home);
app.use('/channel1', channel1);

io.on('connection', (socket) => {
    console.log('Cliente conectado a Socket.IO');

    socket.on('message', (message) => {
        io.emit('message', message); // Envía el mensaje a todos los clientes conectados
    });

    // Manejo de ofertas
    socket.on('offer', (data) => {
        if (!data || !data.offer || !data.offer.type || !data.offer.sdp) {
            console.error('Oferta inválida recibida:', data);
            return;
        }
        console.log(`Oferta recibida de ${socket.id}:`, data);
        socket.broadcast.emit('offer', data);
    });

    // Manejo de respuestas
    socket.on('answer', (data) => {
        if (!data || !data.answer || !data.answer.type || !data.answer.sdp) {
            console.error('Respuesta inválida recibida:', data);
            return;
        }
        console.log(`Respuesta recibida de ${socket.id}:`, data);
        socket.broadcast.emit('answer', data);
    });

    // Manejo de candidatos ICE
    socket.on('ice-candidate', (data) => {
        if (!data || !data.candidate) {
            console.error('Candidato ICE inválido recibido:', data);
            return;
        }
        console.log(`Candidato ICE recibido de ${socket.id}:`, data);
        socket.broadcast.emit('ice-candidate', data);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado de Socket.IO');
    });
});

server.listen(3000, () => {
    console.log('Servidor iniciado en http://localhost:3000');
});
