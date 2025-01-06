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
const decode_token_1 = __importDefault(require("../../functions/decode-token"));
const router = express_1.default.Router();
router.use(express_1.default.json());
router.post('/addUserChannel1', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_user, channelId = 1, muted = false } = req.body;
    let decodedIdUser;
    try {
        // Decodificar el token
        decodedIdUser = (0, decode_token_1.default)(id_user);
        console.log('Id decodificado:', decodedIdUser);
    }
    catch (err) {
        console.error('Error decoding token:', err);
        return res.status(400).json({ error: 'Invalid token' });
    }
    db_1.default.beginTransaction((err) => {
        if (err) {
            console.error('Error al iniciar la transacción:', err);
            return res.status(500).json({ error: 'Error al iniciar la transacción.' });
        }
        const insertQuery = 'INSERT INTO connected_users (id_user, channel_id, muted) VALUES (?, ?, ?)';
        const insertParams = [decodedIdUser, channelId, muted];
        db_1.default.query(insertQuery, insertParams, (error, result) => {
            if (error) {
                return db_1.default.rollback(() => {
                    console.error('Error al insertar usuario en la tabla:', error);
                    res.status(500).json({ error: 'Error al insertar usuario en la tabla.' });
                });
            }
            db_1.default.commit((commitErr) => {
                if (commitErr) {
                    return db_1.default.rollback(() => {
                        console.error('Error al confirmar la transacción:', commitErr);
                        res.status(500).json({ error: 'Error al confirmar la transacción.' });
                    });
                }
                const selectQuery = 'SELECT id_user, name, license FROM users WHERE id_user = ?';
                db_1.default.query(selectQuery, [decodedIdUser], (userError, userResult) => {
                    if (userError) {
                        return db_1.default.rollback(() => {
                            console.error('Error al obtener datos del usuario:', userError);
                            res.status(500).json({ error: 'Error al obtener datos del usuario.' });
                        });
                    }
                    if (!Array.isArray(userResult) || userResult.length === 0) {
                        console.error('No se encontraron datos del usuario.');
                        return res.status(404).json({ error: 'Usuario no encontrado.' });
                    }
                    const user = userResult[0];
                    // Emitir evento con Socket.IO si está disponible
                    if (req.io) {
                        setTimeout(() => {
                            req.io.emit('new-user-channel1', {
                                id_user: user.id_user,
                                name: user.name,
                                license: user.license,
                            });
                        }, 1000); // Retraso de 1 segundo
                    }
                    else {
                        console.error('Socket.IO no está disponible en req');
                    }
                    res.status(201).json({ message: 'Usuario agregado al canal.' });
                });
            });
        });
    });
}));
exports.default = router;
