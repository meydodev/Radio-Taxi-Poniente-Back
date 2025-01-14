import connection from '../../db/db';
import decodeToken from '../../functions/decode-token';
import bcrypt from 'bcrypt';
import express, { Request, Response } from 'express';

const router = express.Router();



// Promisificar las funciones de conexión
router.get('/getDataUser', async (req, res) => {
    const { id_user } = req.query; // Obtener el token de los parámetros de consulta

    // Validar que el token esté presente
    if (!id_user || typeof id_user !== 'string') {
        return res.status(400).json({ error: 'El id_user es requerido y debe ser un string.' });
    }

    try {
        const decodeUser = decodeToken(id_user); // Decodificar el token
        
        //console.log('decodeUser', decodeUser);

        // Iniciar transacción
        await new Promise<void>((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Consulta para obtener los datos del usuario
        const user = await new Promise<any[]>((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE id_user = ?';
            connection.query(query, [decodeUser], (err, results) => {
                if (err) return reject(err);
                if (!Array.isArray(results) || results.length === 0) {
                    return reject(new Error('Usuario no encontrado.'));
                }
                resolve(results); // Retorna el array completo
            });
        });

        // Confirmar transacción
        await new Promise<void>((resolve, reject) => {
            connection.commit((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // Responder con los datos del usuario
        res.status(200).json({ user: user[0] }); // Retorna el primer usuario encontrado
        //console.log('datos del usuario', user[0]);
    } catch (err) {
        console.error('Error durante la transacción:', err);

        // Revertir transacción en caso de error
        await new Promise<void>((resolve) => {
            connection.rollback(() => {
                resolve(); // Continuar aunque el rollback falle
            });
        });

        if (err instanceof Error) {
            if (err.message === 'Usuario no encontrado.') {
                res.status(404).json({ error: err.message });
            } else {
                res.status(500).json({ error: 'Error al obtener los datos del usuario.' });
            }
        } else {
            res.status(500).json({ error: 'Error desconocido.' });
        }
    }
});





router.put('/update-profile', async (req: Request, res: Response) => {
    try {
        //console.log('Función llamada: /update-profile');

        // Extraer el token del encabezado de autorización
        const authHeader = req.headers.authorization;
        //console.log('Token recibido:', authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('Token de autenticación no proporcionado o malformado');
            return res.status(400).json({ message: 'Token de autenticación requerido' });
        }

        const token = authHeader.split(' ')[1];
        const decodedUser = decodeToken(token);
        //console.log('Token decodificado:', decodedUser);

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
        await new Promise<void>((resolve, reject) => {
            connection.beginTransaction((err) => {
                if (err) {
                    console.error('Error al iniciar la transacción:', err);
                    return reject(err);
                }
                resolve();
            });
        });

        try {
            // Crear el objeto con los campos a actualizar
            const fieldsToUpdate: any = { name, surnames, email, license };
            console.log('Campos para actualizar:', fieldsToUpdate);

            // Encriptar contraseña si se proporciona
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 12);
                fieldsToUpdate.password = hashedPassword;
                console.log('Contraseña encriptada añadida a los campos');
            }

            // Actualizar en la base de datos
            const query = 'UPDATE users SET ? WHERE id_user = ?';
            console.log('Ejecutando consulta SQL:', query, fieldsToUpdate, id_user);

            await new Promise<void>((resolve, reject) => {
                connection.query(query, [fieldsToUpdate, id_user], (error, results: any) => {
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
            await new Promise<void>((resolve, reject) => {
                connection.commit((err) => {
                    if (err) {
                        console.error('Error al confirmar la transacción:', err);
                        return reject(err);
                    }
                    resolve();
                });
            });

            console.log('Perfil actualizado correctamente');
            res.status(200).json({ message: 'Perfil actualizado correctamente' });
        } catch (error) {
            // Revertir la transacción si ocurre un error
            console.error('Error durante la transacción, revirtiendo cambios:', error);
            await new Promise<void>((resolve) => {
                connection.rollback(() => resolve());
            });
            res.status(500).json({ message: 'Error al actualizar el perfil' });
        }
    } catch (error) {
        console.error('Error interno del servidor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});





router.delete('/deleteUser', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;

    //console.log('Función llamada: /deleteUser');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Token de autenticación no proporcionado o malformado');
        return res.status(400).json({ message: 'Token de autenticación requerido' });
    }

    const token = authHeader.split(' ')[1];
    const id_user = decodeToken(token);

    if (!id_user) {
       //console.error('Token inválido o no contiene id_user');
        return res.status(400).json({ message: 'Token inválido o no contiene id_user' });
    }

    try {
        // Inicia la transacción
        await new Promise<void>((resolve, reject) => {
            connection.beginTransaction(async (transactionError) => {
                if (transactionError) {
                    console.error('Error al iniciar la transacción:', transactionError);
                    return reject(transactionError);
                }

                try {
                    const query = 'DELETE FROM users WHERE id_user = ?';
                    await new Promise<void>((resolveQuery, rejectQuery) => {
                        connection.query(query, [id_user], (queryError, results) => {
                            if (queryError) {
                                console.error('Error al ejecutar la consulta:', queryError);
                                return rejectQuery(queryError);
                            }
                            resolveQuery();
                        });
                    });

                    // Confirma la transacción
                    connection.commit((commitError) => {
                        if (commitError) {
                            console.error('Error al confirmar la transacción:', commitError);
                            return reject(commitError);
                        }
                        resolve();
                    });
                } catch (error) {
                    console.error('Error durante la transacción:', error);

                    // Si ocurre un error, deshace la transacción
                    connection.rollback(() => {
                        reject(error);
                    });
                }
            });
        });

        res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error interno del servidor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});











export default router;