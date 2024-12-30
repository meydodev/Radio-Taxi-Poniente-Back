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
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../../db/db"));
const router = express_1.default.Router();
const saltRounds = 12;
router.post('/new-user', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validar los datos de entrada
        const { name, type = 'user', surnames, password, email, license, keyAccess, } = req.body;
        if (!email || !password || !name || !type || !surnames || !license) {
            res.status(400).json({ message: 'Todos los campos son obligatorios' });
            return;
        }
        if (keyAccess !== 'TaxiRadio') {
            res.status(400).json({ message: 'Clave de acceso incorrecta' });
            return;
        }
        const hashedPassword = yield bcrypt_1.default.hash(password, saltRounds);
        const usuario = { name, type, surnames, email, license, password: hashedPassword };
        // Iniciar la transacción
        db_1.default.beginTransaction((err) => {
            if (err) {
                console.error('Error al iniciar la transacción:', err);
                res.status(500).json({ message: 'Error al iniciar la transacción' });
                return;
            }
            // Insertar el usuario en la base de datos
            const query = `INSERT INTO users SET ?`;
            db_1.default.query(query, usuario, (error, results) => {
                if (error) {
                    console.error('Error al insertar el usuario:', error);
                    if (error.code === 'ER_DUP_ENTRY') {
                        db_1.default.rollback(() => {
                            res.status(400).json({ message: 'El correo electrónico ya está registrado' });
                        });
                    }
                    else {
                        db_1.default.rollback(() => {
                            res.status(500).json({ message: 'Error al insertar el usuario' });
                        });
                    }
                    return;
                }
                // Confirmar la transacción
                db_1.default.commit((err) => {
                    if (err) {
                        console.error('Error al confirmar la transacción:', err);
                        db_1.default.rollback(() => {
                            res.status(500).json({ message: 'Error al confirmar la transacción' });
                        });
                        return;
                    }
                    res.status(200).json({ message: 'Usuario registrado correctamente' });
                });
            });
        });
    }
    catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
}));
exports.default = router;
