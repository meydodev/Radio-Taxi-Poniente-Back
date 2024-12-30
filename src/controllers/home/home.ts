import express from 'express';
import connection from '../../db/db';
import decodeToken from '../../functions/decode-token';

const router = express.Router();
router.use(express.json());



router.post('/addUserChannel1', async(req, res) => {
    const { id_user, channelId = 1, muted = false } = req.body;
  
    let decodedIdUser;
    try {
      // Decodificar el token
      decodedIdUser = decodeToken(id_user);
      console.log('Id decodificado:',decodedIdUser);
    } catch (err) {
      console.error('Error decoding token:', err);
      return res.status(400).json({ error: 'Invalid token' });
    }
  
    //console.log('Decoded ID:', decodedIdUser);
  
    connection.beginTransaction((err) => {
      if (err) {
        console.error('Error al iniciar la transacción:', err);
        return res.status(500).send({ error: 'Error al iniciar la transacción.' });
      }
  
      connection.query(
        'INSERT INTO connected_users (id_user, channel_id, muted) VALUES (?, ?, ?)',
        [decodedIdUser, channelId, muted],
        (error, result) => {
          if (error) {
            return connection.rollback(() => {
              console.error('Error al insertar usuario en la tabla:', error);
              res.status(500).send({ error: 'Error al insertar usuario en la tabla.' });
            });
          }
  
          connection.commit((commitErr) => {
            if (commitErr) {
              return connection.rollback(() => {
                console.error('Error al confirmar la transacción:', commitErr);
                res.status(500).send({ error: 'Error al confirmar la transacción.' });
              });
            }
  
            // Emitir evento con Socket.IO usando req.io
            if ((req as any).io) {
              (req as any).io.emit('new-user-channel1', {
                message: 'Nuevo usuario agregado al canal 1',
              });
            } else {
              console.error('Socket.IO no está disponible en req');
            }
  
            res.status(201).send({ message: 'Usuario agregado al canal.' });
          });
        }
      );
    });
  });
  
  
  
  
  





export default router;