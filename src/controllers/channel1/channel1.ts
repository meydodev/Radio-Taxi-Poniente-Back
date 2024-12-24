import express from 'express';
import connection from '../../db/db';
import decodeToken from '../../functions/decode-token';

const router = express.Router();
let currentSpeaker: string | null = null;


router.get('/getUsers', async (req, res) => {
    try {
        // Iniciar transacción
        await new Promise((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) return reject(err);
                resolve(null);
            });
        });

        const query = `
            SELECT u.id_user, u.name, u.license 
            FROM connected_users cu
            JOIN users u ON cu.id_user = u.id_user
            WHERE cu.channel_id = 1
        `;

        const results = await new Promise((resolve, reject) => {
            connection.query(query, (error, results) => {
                if (error) return reject(error);
                resolve(results);
            });
        });

        // Confirmar transacción
        await new Promise((resolve, reject) => {
            connection.commit((err) => {
                if (err) return reject(err);
                resolve(null);
            });
        });

        res.status(200).json({ data: results });
    } catch (err) {
        console.error("Error al obtener los usuarios conectados:", err);
        await new Promise((resolve) => connection.rollback(() => resolve(null)));
        res.status(500).json({ error: "Error al obtener los usuarios conectados." });
    }
});

router.delete('/deleteUser/:id_user', async (req, res) => {
    const { id_user } = req.params;

    try {
        const decodedIdUser = decodeToken(id_user);

        connection.beginTransaction((err) => {
            if (err) throw err;

            connection.query(
                'DELETE FROM connected_users WHERE id_user = ?',
                [decodedIdUser],
                (error, result) => {
                    if (error) {
                        return connection.rollback(() => {
                            console.error('Error al borrar usuario:', error);
                            res.status(500).json({ error: 'Error al borrar usuario.' });
                        });
                    }

                    connection.commit((commitErr) => {
                        if (commitErr) {
                            return connection.rollback(() => {
                                console.error('Error al confirmar la transacción:', commitErr);
                                res.status(500).json({ error: 'Error al confirmar la transacción.' });
                            });
                        }

                        if ((req as any).io) {
                            (req as any).io.emit('user-exit-channel1', {
                                message: 'Usuario eliminado en el canal 1',
                            });
                        }

                        res.status(200).json({ message: 'Usuario eliminado correctamente.' });
                    });
                }
            );
        });
    } catch (err) {
        console.error('Error al procesar eliminación del usuario:', err);
        res.status(400).json({ error: 'Token inválido o error interno.' });
    }
});

router.post('/start-speaking', (req, res) => {
    const { id_user } = req.body;

    try {
        const decodedIdUser = decodeToken(id_user);

        if (currentSpeaker) {
            return res.status(403).json({ error: 'Otro usuario ya está hablando' });
        }

        currentSpeaker = decodedIdUser;

        if ((req as any).io) {
            (req as any).io.emit('start-speaking', { id_user: decodedIdUser });
        }

        res.status(200).json({ message: 'Usuario autorizado para hablar' });
    } catch (err) {
        console.error('[START SPEAKING] Error decoding token:', err);
        res.status(400).json({ error: 'Token inválido.' });
    }
});

router.post('/stop-speaking', (req, res) => {
    const { id_user } = req.body;

    try {
        const decodedIdUser = decodeToken(id_user);

        if (currentSpeaker !== decodedIdUser) {
            return res.status(403).json({ error: 'Este usuario no tiene el control del canal' });
        }

        currentSpeaker = null ;

        if ((req as any).io) {
            (req as any).io.emit('stop-speaking', { id_user: decodedIdUser });
        }

        res.status(200).json({ message: 'Canal liberado' });
    } catch (err) {
        console.error('[STOP SPEAKING] Error decoding token:', err);
        res.status(400).json({ error: 'Token inválido.' });
    }
});

export default router;
