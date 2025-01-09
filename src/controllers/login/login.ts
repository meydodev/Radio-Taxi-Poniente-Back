import express from 'express';
import { Request, Response } from 'express';
import connection from "../../db/db";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


const router = express.Router();
const SECRET_KEY = 'dK7$gB@5mN!2pX&9qV^8yZ*3xR6+L0zC4hW1F!';

router.use(express.json());


router.post('/verify', async (req: Request, res: Response)=> {

    const { email, password } = req.body;

    //console.log(`Intento de login con email: ${email}`); // Debugging

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const query = `SELECT * FROM users WHERE email = ?;`;

    try {
        const [rows]: any = await connection.promise().query(query, [email]);
        const resultado = rows;

        //console.log('Usuario encontrado:', resultado.length > 0); // Debugging

        if (resultado.length > 0) {
            const usuario: any = resultado[0];
            const match = await bcrypt.compare(password, usuario.password);

            //console.log('Coincidencia de contraseña:', match); // Debugging

            if (match) {
                const token = jwt.sign({ id_user: usuario.id_user, type: usuario.type }, SECRET_KEY);
                return res.json({ token });
            } else {
                return res.status(401).json({ message: 'Usuario o contraseña incorrecto' });
            }
        } else {
            return res.status(401).json({ message: 'Usuario o contraseña incorrecto' });
        }
    } catch (error) {
        console.error('Error en el proceso de autenticación:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
    }
});



export default router;
