"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const register_1 = __importDefault(require("./controllers/register/register"));
const login_1 = __importDefault(require("./controllers/login/login"));
const home_1 = __importDefault(require("./controllers/home/home"));
const profile_1 = __importDefault(require("./controllers/profile/profile"));
const channel1_1 = __importDefault(require("./controllers/channel1/channel1"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Configurar CORS
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../dist/uploads')));
// Crear el servidor HTTP
const httpServer = app.listen(3000, () => {
    console.log('Servidor iniciado en http://localhost:3000');
});
// Configurar Socket.IO con el servidor HTTP
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Authorization'],
        credentials: true
    }
});
// Middleware para inyectar Socket.IO en `req`
app.use((req, res, next) => {
    req.io = io; // Inyectar la instancia de io en req
    next();
});
// Rutas
app.use('/login', login_1.default);
app.use('/register', register_1.default);
app.use('/home', home_1.default);
app.use('/profile', profile_1.default);
app.use('/channel1', channel1_1.default);
// Eventos de Socket.IO
let currentRecorder = null;
io.on('connection', (socket) => {
    //console.log(`Cliente conectado: ${socket.id}`);
    // Manejar el inicio de la grabación
    socket.on('start-recording', ({ token }) => {
        if (currentRecorder) {
            // Si ya hay un grabador, no permite que otro comience
            socket.emit('recording-denied', { message: 'Otro usuario está grabando.' });
            console.warn(`Intento de grabación rechazado. Grabador actual: ${currentRecorder}`);
        }
        else {
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
        }
        else {
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
