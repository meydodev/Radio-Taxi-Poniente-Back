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
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express_1.default.Router();
// Crear directorio si no existe
const uploadDir = path.join(__dirname, '../../../dist/uploads/audio_channel_1');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Configuración de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Guardar en el directorio definido
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // Nombre único
    },
});
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Validar tipo de archivo
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        }
        else {
            console.log('Archivo no válido:', file.mimetype);
            cb(new Error('Solo se permiten archivos de audio'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 },
});
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
            SELECT DISTINCT u.id_user, u.name, u.license 
            FROM connected_users_channel_1 cu
            JOIN users u ON cu.id_user = u.id_user
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
            db_1.default.query('DELETE FROM connected_users_channel_1 WHERE id_user = ?', [decodedIdUser], (error, result) => {
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
                    // Emitir el evento con el id_user eliminado
                    if (req.io) {
                        req.io.emit('user-exit-channel1', {
                            id_user: decodedIdUser, // Incluir el ID del usuario eliminado
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
router.post('/upload-audio', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Error de Multer:', err.message);
            return res.status(400).json({ success: false, message: err.message });
        }
        else if (err) {
            console.error('Error al subir el archivo:', err.message);
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //console.log('Solicitud recibida en /upload-audio');
    // Verificar si se recibió un archivo
    if (!req.file) {
        console.log('No se recibió ningún archivo en la solicitud');
        return res.status(400).json({ success: false, message: 'No se recibió un archivo.' });
    }
    //console.log('Archivo recibido:', req.file);
    // Ruta relativa para guardar en la base de datos
    const audioUrl = `${req.protocol}://${req.get('host')}/uploads/audio_channel_1/${req.file.filename}`;
    const userId = req.body.id_user; // Asegúrate de enviar el ID del usuario en la solicitud
    const id_user = (0, decode_token_1.default)(userId);
    const duration = req.body.duration;
    //console.log('Datos procesados - Audio URL:', audioUrl, 'User ID:', id_user);
    //console.log('Usuario recivido:',id_user)
    // Validar userId
    if (!id_user) {
        console.log('El ID del usuario no fue proporcionado');
        return res.status(400).json({ success: false, message: 'El ID del usuario es requerido.' });
    }
    try {
        //console.log('Iniciando transacción en la base de datos');
        // Iniciar la transacción
        yield new Promise((resolve, reject) => {
            db_1.default.beginTransaction((err) => {
                if (err) {
                    console.error('Error al iniciar la transacción:', err);
                    return reject(err);
                }
                resolve(null);
            });
        });
        //console.log('Transacción iniciada con éxito');
        // Guardar el audio en la base de datos
        const insertQuery = `
        INSERT INTO audio_uploads_channel_1 (id_user, audio_url, duration)
        VALUES (?, ?, ?)
      `;
        yield new Promise((resolve, reject) => {
            db_1.default.query(insertQuery, [id_user, audioUrl, duration], (error, results) => {
                if (error) {
                    console.error('Error al insertar datos en la base de datos:', error);
                    return reject(error);
                }
                //console.log('Datos insertados en la base de datos:', results);
                resolve(results);
            });
        });
        // Confirmar la transacción
        yield new Promise((resolve, reject) => {
            db_1.default.commit((err) => {
                if (err) {
                    console.error('Error al confirmar la transacción:', err);
                    return reject(err);
                }
                //console.log('Transacción confirmada con éxito');
                resolve(null);
            });
        });
        // Emitir el evento con Socket.IO
        if (req.io) {
            //console.log('Emitiendo evento de audio subido al canal');
            req.io.emit('audio-uploaded-channel1', { audioUrl, userId, duration });
            //console.log('Evento emitido con éxito con el usuario:', id_user);
        }
        else {
            console.log('Socket.IO no disponible en la solicitud');
        }
        // Respuesta exitosa
        res.status(200).json({ success: true, audioUrl, duration });
    }
    catch (error) {
        console.error('Error al procesar la solicitud:', error);
        // Revertir la transacción
        yield new Promise((resolve) => {
            db_1.default.rollback(() => {
                console.log('Transacción revertida');
                resolve(null);
            });
        });
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
}));
router.delete('/delete-audios', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const directory = path.join(__dirname, '../../../dist/uploads/audio_channel_1');
    try {
        console.log('Eliminando audios en el directorio:', directory);
        // Verificar si el directorio existe
        if (!fs.existsSync(directory)) {
            console.log('El directorio no existe, no hay archivos para eliminar.');
            return res.status(200).json({ success: true, message: 'No hay audios para eliminar.' });
        }
        // Leer los archivos en el directorio
        const files = yield new Promise((resolve, reject) => {
            fs.readdir(directory, (err, files) => {
                if (err) {
                    console.error('Error al leer el directorio:', err);
                    return reject(err);
                }
                resolve(files);
            });
        });
        console.log('Archivos encontrados en el directorio:', files);
        // Eliminar cada archivo encontrado
        for (const file of files) {
            const filePath = path.join(directory, file);
            console.log(`Intentando eliminar archivo: ${filePath}`);
            yield new Promise((resolve, reject) => {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(`Error al eliminar el archivo ${filePath}:`, err);
                        return reject(err);
                    }
                    console.log(`Archivo eliminado correctamente: ${filePath}`);
                    resolve(null);
                });
            });
        }
        // Eliminar registros de la tabla
        const deleteUsersQuery = 'DELETE FROM connected_users_channel_1';
        yield new Promise((resolve, reject) => {
            db_1.default.query(deleteUsersQuery, (error, results) => {
                if (error) {
                    console.error('Error al eliminar registros de connected_users_channel_1:', error);
                    return reject(error);
                }
                console.log('Registros eliminados de connected_users_channel_1:', results);
                resolve(null);
            });
        });
        // Reiniciar AUTO_INCREMENT
        const resetConnectionIdQuery = 'ALTER TABLE connected_users_channel_1 AUTO_INCREMENT = 1';
        yield new Promise((resolve, reject) => {
            db_1.default.query(resetConnectionIdQuery, (error, results) => {
                if (error) {
                    console.error('Error al reiniciar AUTO_INCREMENT en connected_users_channel_1:', error);
                    return reject(error);
                }
                console.log('AUTO_INCREMENT reiniciado para connected_users_channel_1:', results);
                resolve(null);
            });
        });
        // Eliminar las URLs de la base de datos
        const deleteQuery = 'DELETE FROM audio_uploads_channel_1';
        yield new Promise((resolve, reject) => {
            db_1.default.query(deleteQuery, (error, results) => {
                if (error) {
                    console.error('Error al eliminar URLs de la base de datos:', error);
                    return reject(error);
                }
                console.log('URLs eliminadas de la base de datos:', results);
                resolve(null);
            });
        });
        // Reiniciar el AUTO_INCREMENT
        const resetQuery = 'ALTER TABLE audio_uploads_channel_1 AUTO_INCREMENT = 1';
        yield new Promise((resolve, reject) => {
            db_1.default.query(resetQuery, (error, results) => {
                if (error) {
                    console.error('Error al reiniciar AUTO_INCREMENT:', error);
                    return reject(error);
                }
                console.log('AUTO_INCREMENT reiniciado:', results);
                resolve(null);
            });
        });
        console.log('Todos los audios han sido eliminados y la tabla reiniciada.');
        res.status(200).json({ success: true, message: 'Todos los audios y URLs han sido eliminados con éxito.' });
    }
    catch (error) {
        console.error('Error al eliminar los audios:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar los audios.', error });
    }
}));
exports.default = router;
