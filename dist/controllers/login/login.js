"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../../db/db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = express_1.default.Router();
const SECRET_KEY = 'dK7$gB@5mN!2pX&9qV^8yZ*3xR6+L0zC4hW1F!';
router.use(express_1.default.json());
router.post('/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    console.log(`Intento de login con email: ${email}`); // Debugging
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }
    const query = `SELECT * FROM users WHERE email = ?;`;
    try {
        const [rows] = yield db_1.default.promise().query(query, [email]);
        const resultado = rows;
        //console.log('Usuario encontrado:', resultado.length > 0); // Debugging
        if (resultado.length > 0) {
            const usuario = resultado[0];
            const match = yield bcrypt_1.default.compare(password, usuario.password);
            //console.log('Coincidencia de contraseña:', match); // Debugging
            if (match) {
                const token = jsonwebtoken_1.default.sign({ id: usuario.id_user }, SECRET_KEY, { expiresIn: '30m' });
                const usuarioId = jsonwebtoken_1.default.sign({ usuarioId: usuario.id_user }, SECRET_KEY, { expiresIn: '30m' });
                const permiso = jsonwebtoken_1.default.sign({ permiso: usuario.permiso }, SECRET_KEY, { expiresIn: '30m' });
                return res.json({ token, usuarioId, permiso });
            }
            else {
                return res.status(401).json({ message: 'Usuario o contraseña incorrecto' });
            }
        }
        else {
            return res.status(401).json({ message: 'Usuario o contraseña incorrecto' });
        }
    }
    catch (error) {
        console.error('Error en el proceso de autenticación:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
}));
exports.default = router;
