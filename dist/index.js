"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const register_1 = __importDefault(require("./controllers/register/register"));
const login_1 = __importDefault(require("./controllers/login/login"));
const home_1 = __importDefault(require("./controllers/home/home"));
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
app.use('/channel1', channel1_1.default);
// Eventos de Socket.IO
io.on('connection', (socket) => {
    //console.log('Cliente conectado a Socket.IO');
    socket.on('disconnect', () => {
        // console.log('Cliente desconectado de Socket.IO');
    });
});
