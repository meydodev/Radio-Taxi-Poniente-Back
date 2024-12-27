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
let currentSpeaker = null;
router.get('/getUsers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Iniciar transacción
        yield new Promise((resolve, reject) => {
            db_1.default.beginTransaction((err) => {
                if (err)
                    return reject(err);
                resolve(null);
            });
        });
        const query = `
            SELECT u.id_user, u.name, u.license 
            FROM connected_users cu
            JOIN users u ON cu.id_user = u.id_user
            WHERE cu.channel_id = 1
        `;
        const results = yield new Promise((resolve, reject) => {
            db_1.default.query(query, (error, results) => {
                if (error)
                    return reject(error);
                resolve(results);
            });
        });
        // Confirmar transacción
        yield new Promise((resolve, reject) => {
            db_1.default.commit((err) => {
                if (err)
                    return reject(err);
                resolve(null);
            });
        });
        res.status(200).json({ data: results });
    }
    catch (err) {
        console.error("Error al obtener los usuarios conectados:", err);
        yield new Promise((resolve) => db_1.default.rollback(() => resolve(null)));
        res.status(500).json({ error: "Error al obtener los usuarios conectados." });
    }
}));
router.delete('/deleteUser/:id_user', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_user } = req.params;
    try {
        const decodedIdUser = (0, decode_token_1.default)(id_user);
        db_1.default.beginTransaction((err) => {
            if (err)
                throw err;
            db_1.default.query('DELETE FROM connected_users WHERE id_user = ?', [decodedIdUser], (error, result) => {
                if (error) {
                    return db_1.default.rollback(() => {
                        console.error('Error al borrar usuario:', error);
                        res.status(500).json({ error: 'Error al borrar usuario.' });
                    });
                }
                db_1.default.commit((commitErr) => {
                    if (commitErr) {
                        return db_1.default.rollback(() => {
                            console.error('Error al confirmar la transacción:', commitErr);
                            res.status(500).json({ error: 'Error al confirmar la transacción.' });
                        });
                    }
                    if (req.io) {
                        req.io.emit('user-exit-channel1', {
                            message: 'Usuario eliminado en el canal 1',
                        });
                    }
                    res.status(200).json({ message: 'Usuario eliminado correctamente.' });
                });
            });
        });
    }
    catch (err) {
        console.error('Error al procesar eliminación del usuario:', err);
        res.status(400).json({ error: 'Token inválido o error interno.' });
    }
}));
exports.default = router;
