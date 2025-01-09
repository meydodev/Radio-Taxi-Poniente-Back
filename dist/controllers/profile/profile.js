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
const db_1 = __importDefault(require("../../db/db"));
const decode_token_1 = __importDefault(require("../../functions/decode-token"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
// Promisificar las funciones de conexión
router.get('/getDataUser', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id_user } = req.query; // Obtener el token de los parámetros de consulta
    // Validar que el token esté presente
    if (!id_user || typeof id_user !== 'string') {
        return res.status(400).json({ error: 'El id_user es requerido y debe ser un string.' });
    }
    try {
        const decodeUser = (0, decode_token_1.default)(id_user); // Decodificar el token
        //console.log('decodeUser', decodeUser);
        // Iniciar transacción
        yield new Promise((resolve, reject) => {
            db_1.default.beginTransaction((err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
        // Consulta para obtener los datos del usuario
        const user = yield new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE id_user = ?';
            db_1.default.query(query, [decodeUser], (err, results) => {
                if (err)
                    return reject(err);
                if (!Array.isArray(results) || results.length === 0) {
                    return reject(new Error('Usuario no encontrado.'));
                }
                resolve(results); // Retorna el array completo
            });
        });
        // Confirmar transacción
        yield new Promise((resolve, reject) => {
            db_1.default.commit((err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
        // Responder con los datos del usuario
        res.status(200).json({ user: user[0] }); // Retorna el primer usuario encontrado
        //console.log('datos del usuario', user[0]);
    }
    catch (err) {
        console.error('Error durante la transacción:', err);
        // Revertir transacción en caso de error
        yield new Promise((resolve) => {
            db_1.default.rollback(() => {
                resolve(); // Continuar aunque el rollback falle
            });
        });
        if (err instanceof Error) {
            if (err.message === 'Usuario no encontrado.') {
                res.status(404).json({ error: err.message });
            }
            else {
                res.status(500).json({ error: 'Error al obtener los datos del usuario.' });
            }
        }
        else {
            res.status(500).json({ error: 'Error desconocido.' });
        }
    }
}));
router.put('/update-profile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Función llamada: /update-profile');
        // Extraer el token del encabezado de autorización
        const authHeader = req.headers.authorization;
        console.log('Token recibido:', authHeader);
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('Token de autenticación no proporcionado o malformado');
            return res.status(400).json({ message: 'Token de autenticación requerido' });
        }
        const token = authHeader.split(' ')[1];
        const decodedUser = (0, decode_token_1.default)(token);
        console.log('Token decodificado:', decodedUser);
        if (!decodedUser) {
            console.error('Token inválido o no contiene id_user');
            return res.status(400).json({ message: 'Token inválido o no contiene id_user' });
        }
        const id_user = decodedUser;
        const { name, surnames, email, license, password } = req.body;
        console.log('Datos recibidos del cuerpo:', { name, surnames, email, license, password });
        // Validar que los campos requeridos estén presentes
        if (!name || !surnames || !email || !license) {
            console.error('Faltan campos obligatorios en el cuerpo de la solicitud');
            return res.status(400).json({
                message: 'Los campos name, surnames, email y license son obligatorios',
            });
        }
        // Iniciar la transacción
        console.log('Iniciando transacción...');
        yield new Promise((resolve, reject) => {
            db_1.default.beginTransaction((err) => {
                if (err) {
                    console.error('Error al iniciar la transacción:', err);
                    return reject(err);
                }
                resolve();
            });
        });
        try {
            // Crear el objeto con los campos a actualizar
            const fieldsToUpdate = { name, surnames, email, license };
            console.log('Campos para actualizar:', fieldsToUpdate);
            // Encriptar contraseña si se proporciona
            if (password) {
                const hashedPassword = yield bcrypt_1.default.hash(password, 12);
                fieldsToUpdate.password = hashedPassword;
                console.log('Contraseña encriptada añadida a los campos');
            }
            // Actualizar en la base de datos
            const query = 'UPDATE users SET ? WHERE id_user = ?';
            console.log('Ejecutando consulta SQL:', query, fieldsToUpdate, id_user);
            yield new Promise((resolve, reject) => {
                db_1.default.query(query, [fieldsToUpdate, id_user], (error, results) => {
                    if (error) {
                        console.error('Error en la consulta SQL:', error);
                        return reject(error);
                    }
                    if (!results || results.affectedRows === 0) {
                        console.error('No se encontró ningún usuario con id_user:', id_user);
                        return reject(new Error('Usuario no encontrado'));
                    }
                    resolve();
                });
            });
            // Confirmar la transacción
            console.log('Confirmando transacción...');
            yield new Promise((resolve, reject) => {
                db_1.default.commit((err) => {
                    if (err) {
                        console.error('Error al confirmar la transacción:', err);
                        return reject(err);
                    }
                    resolve();
                });
            });
            console.log('Perfil actualizado correctamente');
            res.status(200).json({ message: 'Perfil actualizado correctamente' });
        }
        catch (error) {
            // Revertir la transacción si ocurre un error
            console.error('Error durante la transacción, revirtiendo cambios:', error);
            yield new Promise((resolve) => {
                db_1.default.rollback(() => resolve());
            });
            res.status(500).json({ message: 'Error al actualizar el perfil' });
        }
    }
    catch (error) {
        console.error('Error interno del servidor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
}));
exports.default = router;
