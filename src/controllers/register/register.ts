import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import connection from '../../db/db';

const router = express.Router();
const saltRounds = 12;


router.post('/new-user', async (req: Request, res: Response) => {
    try {
        // Validar los datos de entrada
        const { name, surnames, password, email, license, keyAccess } = req.body;

        if (!email || !password || !name || !surnames || !license) {
            res.status(400).json({ message: 'Todos los campos son obligatorios' });
            return;
        }

        if (keyAccess !== 'TaxiRadio') {
            res.status(400).json({ message: 'Clave de acceso incorrecta' });
            return;
        }

        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const usuario = { name, surnames, email, license, password: hashedPassword };

        // Iniciar la transacción
        connection.beginTransaction((err) => {
            if (err) {
                console.error('Error al iniciar la transacción:', err);
                res.status(500).json({ message: 'Error al iniciar la transacción' });
                return;
            }

            // Insertar el usuario en la base de datos
            const query = `INSERT INTO users SET ?`;
            connection.query(query, usuario, (error, results) => {
                if (error) {
                    console.error('Error al insertar el usuario:', error);
                    if (error.code === 'ER_DUP_ENTRY') {
                        connection.rollback(() => {
                            res.status(400).json({ message: 'El correo electrónico ya está registrado' });
                        });
                    } else {
                        connection.rollback(() => {
                            res.status(500).json({ message: 'Error al insertar el usuario' });
                        });
                    }
                    return;
                }

                // Confirmar la transacción
                connection.commit((err) => {
                    if (err) {
                        console.error('Error al confirmar la transacción:', err);
                        connection.rollback(() => {
                            res.status(500).json({ message: 'Error al confirmar la transacción' });
                        });
                        return;
                    }
                    res.status(200).json({ message: 'Usuario registrado correctamente' });
                });
            });
        });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});



export default router;
