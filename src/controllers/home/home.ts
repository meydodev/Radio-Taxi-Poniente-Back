import express from 'express';
import connection from '../../db/db';
import decodeToken from '../../functions/decode-token';

const router = express.Router();
router.use(express.json());

router.post('/addUserChannel1', async (req, res) => {
    const { id_user,muted = false,joined_at=new Date() } = req.body;
    let decodedIdUser;

    try {
        // Decodificar el token
        decodedIdUser = decodeToken(id_user);
        //console.log('Id decodificado:', decodedIdUser);
    } catch (err) {
        console.error('Error decoding token:', err);
        return res.status(400).json({ error: 'Invalid token' });
    }

    connection.beginTransaction((err) => {
        if (err) {
            console.error('Error al iniciar la transacción:', err);
            return res.status(500).json({ error: 'Error al iniciar la transacción.' });
        }

        const insertQuery = 'INSERT INTO connected_users_channel_1 (id_user, muted, joined_at) VALUES (?, ?, ?)';
        const insertParams = [decodedIdUser, muted,joined_at];

        connection.query(insertQuery, insertParams, (error, result) => {
            if (error) {
                return connection.rollback(() => {
                    console.error('Error al insertar usuario en la tabla:', error);
                    res.status(500).json({ error: 'Error al insertar usuario en la tabla.' });
                });
            }

            connection.commit((commitErr) => {
                if (commitErr) {
                    return connection.rollback(() => {
                        console.error('Error al confirmar la transacción:', commitErr);
                        res.status(500).json({ error: 'Error al confirmar la transacción.' });
                    });
                }

                const selectQuery = 'SELECT id_user, name, license FROM users WHERE id_user = ?';

                connection.query(selectQuery, [decodedIdUser], (userError, userResult) => {
                    if (userError) {
                        return connection.rollback(() => {
                            console.error('Error al obtener datos del usuario:', userError);
                            res.status(500).json({ error: 'Error al obtener datos del usuario.' });
                        });
                    }

                    if (!Array.isArray(userResult) || userResult.length === 0) {
                        console.error('No se encontraron datos del usuario.');
                        return res.status(404).json({ error: 'Usuario no encontrado.' });
                    }

                    const user = userResult[0] as { id_user: number; name: string; license: string };

                    // Emitir evento con Socket.IO si está disponible
                    if ((req as any).io) {
                        setTimeout(() => {
                            (req as any).io.emit('new-user-channel1', {
                                id_user: user.id_user,
                                name: user.name,
                                license: user.license,
                            });
                        }, 1000); // Retraso de 1 segundo
                    } else {
                        console.error('Socket.IO no está disponible en req');
                    }

                    res.status(201).json({ message: 'Usuario agregado al canal.' });
                });
            });
        });
    });
});

export default router;
