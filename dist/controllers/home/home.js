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
    //console.log('Decoded ID:', decodedIdUser);
    db_1.default.beginTransaction((err) => {
        if (err) {
            console.error('Error al iniciar la transacción:', err);
            return res.status(500).send({ error: 'Error al iniciar la transacción.' });
        }
        db_1.default.query('INSERT INTO connected_users (id_user, channel_id, muted) VALUES (?, ?, ?)', [decodedIdUser, channelId, muted], (error, result) => {
            if (error) {
                return db_1.default.rollback(() => {
                    console.error('Error al insertar usuario en la tabla:', error);
                    res.status(500).send({ error: 'Error al insertar usuario en la tabla.' });
                });
            }
            db_1.default.commit((commitErr) => {
                if (commitErr) {
                    return db_1.default.rollback(() => {
                        console.error('Error al confirmar la transacción:', commitErr);
                        res.status(500).send({ error: 'Error al confirmar la transacción.' });
                    });
                }
                // Emitir evento con Socket.IO usando req.io
                if (req.io) {
                    req.io.emit('new-user-channel1', {
                        message: 'Nuevo usuario agregado al canal 1',
                    });
                }
                else {
                    console.error('Socket.IO no está disponible en req');
                }
                res.status(201).send({ message: 'Usuario agregado al canal.' });
            });
        });
    });
}));
exports.default = router;
