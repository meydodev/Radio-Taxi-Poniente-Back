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


let currentRecorder: string | null = null;

io.on('connection', (socket) => {
    //console.log(`Cliente conectado: ${socket.id}`);

    // Manejar el inicio de la grabación
    socket.on('start-recording', ({ token }) => {
        if (currentRecorder) {
            // Si ya hay un grabador, no permite que otro comience
            socket.emit('recording-denied', { message: 'Otro usuario está grabando.' });
            console.warn(`Intento de grabación rechazado. Grabador actual: ${currentRecorder}`);
        } else {
            // Asigna el grabador actual
            currentRecorder = token;
            io.emit('recording-started', { recorder: token }); // Notifica a todos
            console.log(`Grabación iniciada por el cliente: ${token}`);
        }
    });


    // Manejar el fin de la grabación
    socket.on('stop-recording', ({ token }) => {
        if (currentRecorder === token) {
            // El grabador actual puede detener la grabación
            currentRecorder = null; // Resetea el estado de grabación
            io.emit('recording-stopped'); // Notifica a todos que la grabación ha terminado
            console.log(`Grabación detenida por el cliente: ${token}`);
        } else {
            // Si no es el grabador actual, rechaza la solicitud
            socket.emit('stop-recording-denied', {
                message: 'No tienes permiso para detener la grabación.',
            });
            console.warn(`El cliente con token ${token} intentó detener la grabación, pero no está grabando.`);
        }
    });

    // Evento para forzar el reset manual (opcional para depuración)
    socket.on('reset-recording', () => {
        console.warn(`El estado de grabación se reinicia manualmente por ${socket.id}`);
        currentRecorder = null;
        io.emit('recording-stopped'); // Notifica a todos que la grabación ha terminado
    });

    // Manejar desconexiones
    socket.on('disconnect', () => {
        if (currentRecorder === socket.id) {
            // Si el grabador actual se desconecta, libera el estado
            console.warn(`El grabador ${socket.id} se desconectó mientras grababa.`);
            currentRecorder = null;
            io.emit('recording-stopped'); // Notifica que la grabación ha terminado
        }
    });

    // Manejador de errores generales
    socket.on('error', (err) => {
        console.error(`Error detectado en el cliente ${socket.id}:`, err);
        if (currentRecorder === socket.id) {
            console.warn(`Reiniciando el estado porque el grabador ${socket.id} causó un error.`);
            currentRecorder = null;
            io.emit('recording-stopped');
        }
    });
});