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
    // Manejar el inicio de la grabación
    socket.on('start-recording', ({ token }) => {
        if (currentRecorder) {
            // Si alguien ya está grabando, no permite que otro comience
            socket.emit('recording-denied', { message: 'Otro usuario está grabando.' });
        }
        else {
            // Guarda el token del grabador actual
            currentRecorder = token;
            io.emit('recording-started', { recorder: token }); // Notifica a todos
            //console.log(`Grabación iniciada por el cliente: ${token}`);
        }
    });
    // Manejar el fin de la grabación
    socket.on('stop-recording', ({ token }) => {
        if (currentRecorder === token) {
            // Solo el grabador actual puede detener la grabación
            currentRecorder = null; // Libera el estado de grabación
            io.emit('recording-stopped'); // Notifica a todos que la grabación ha terminado
            //console.log(`Grabación detenida por el cliente: ${token}`);
        }
        else {
            // Si no es el grabador actual, rechaza la solicitud
            socket.emit('stop-recording-denied', {
                message: 'No tienes permiso para detener la grabación.',
            });
            console.warn(`El cliente con token ${token} intentó detener la grabación, pero no está grabando.`);
        }
    });
    // Manejar desconexiones
    socket.on('disconnect', () => {
        if (currentRecorder === socket.id) {
            currentRecorder = null; // Libera el estado si el grabador se desconecta
            io.emit('recording-stopped'); // Notifica que la grabación ha terminado
            //console.log(`Cliente desconectado mientras grababa: ${socket.id}`);
        }
    });
});
