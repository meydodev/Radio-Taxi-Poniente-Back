import jwt from 'jsonwebtoken';
import express, { Request, Response } from 'express';
const SECRET_KEY = process.env.SECRET_KEY as string; // Asegúrate de que la clave secreta esté definida en tu archivo .env
require('dotenv').config();
const router = express.Router();

function decodeToken(token: string): any | null {
  try {
    // Decodifica el token JWT utilizando la clave secreta
    const decoded: any = jwt.verify(token, SECRET_KEY);
    
    // Devuelve los datos decodificados del token
    if (decoded && decoded.id_user) {
      return decoded.id_user; // Corrige el acceso a la propiedad correcta
    } else {
      console.error('Token decodificado no contiene usuarioId');
      return null;
    }
  } catch (error) {
    // Si ocurre algún error durante la decodificación, se captura aquí
    console.error('Error al decodificar el token:', error);
    return null;
  }
}

/*
router.post('/', (req: Request, res: Response) => {
  const token = req.body.token;  // Recibe el token del cuerpo de la solicitud

  console.log('Token recibido:', token);
  // Verificar si el token fue proporcionado
  if (!token) {
    return res.status(400).json({ message: 'No se proporcionó un token' });
  }

  // Decodificar el token y verificar si contiene el usuarioId
  const usuarioId = decodeToken(token);

  if (usuarioId) {
    return res.status(200).json({ usuarioId });
  } else {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
});
 
*/
export default decodeToken;
