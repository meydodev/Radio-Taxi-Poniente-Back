import express from 'express';
import register from './controllers/register/register';
import login from './controllers/login/login';
import home from './controllers/home/home';
import channel1 from './controllers/channel1/channel1';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import https from 'https';
import fs from 'fs';

const app = express();

// Cargar los certificados generados con mkcert
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'cert/localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'cert/localhost+2.pem')),
};

// Configurar CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../dist/uploads')));

// Crear el servidor HTTPS
const httpsServer = https.createServer(httpsOptions, app);

httpsServer.listen(3000, () => {
    console.log('Servidor HTTPS iniciado en https://localhost:3000');
});

// Configurar Socket.IO con el servidor HTTPS
const io = new SocketIOServer(httpsServer, {
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
app.use('/channel1', channel1);

// Eventos de Socket.IO
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
