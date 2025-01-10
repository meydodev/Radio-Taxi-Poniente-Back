import express from 'express';
import connection from '../../db/db';
import decodeToken from '../../functions/decode-token';
const multer = require('multer');
const path = require('path');
const fs = require('fs');




const router = express.Router();



// Crear directorio si no existe
const uploadDir = path.join(__dirname, '../../../dist/uploads/audio');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadDir); // Guardar en el directorio definido
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Nombre único
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req: any, file: any, cb: any) => {
    // Validar tipo de archivo
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      console.log('Archivo no válido:', file.mimetype);
      cb(new Error('Solo se permiten archivos de audio'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});



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
            SELECT DISTINCT u.id_user, u.name, u.license 
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

                      // Emitir el evento con el id_user eliminado
                      if ((req as any).io) {
                          (req as any).io.emit('user-exit-channel1', {
                              id_user: decodedIdUser, // Incluir el ID del usuario eliminado
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



router.post('/upload-audio',(req, res, next) => {
    upload.single('file')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        console.error('Error de Multer:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      } else if (err) {
        console.error('Error al subir el archivo:', err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req: any, res) => {
    //console.log('Solicitud recibida en /upload-audio');

    // Verificar si se recibió un archivo
    if (!req.file) {
      console.log('No se recibió ningún archivo en la solicitud');
      return res.status(400).json({ success: false, message: 'No se recibió un archivo.' });
    }
    //console.log('Archivo recibido:', req.file);

    // Ruta relativa para guardar en la base de datos
    const audioUrl = `${req.protocol}://${req.get('host')}/uploads/audio/${req.file.filename}`;

    const userId = req.body.id_user; // Asegúrate de enviar el ID del usuario en la solicitud
    const id_user= decodeToken(userId);

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
      await new Promise((resolve, reject) => {
        connection.beginTransaction((err: any) => {
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
        INSERT INTO audio_uploads (id_user, audio_url, id_channel)
        VALUES (?, ?, ?)
      `;
      await new Promise((resolve, reject) => {
        connection.query(insertQuery, [id_user, audioUrl, 1], (error: any, results: any) => {
          if (error) {
            console.error('Error al insertar datos en la base de datos:', error);
            return reject(error);
          }
          //console.log('Datos insertados en la base de datos:', results);
          resolve(results);
        });
      });

      // Confirmar la transacción
      await new Promise((resolve, reject) => {
        connection.commit((err: any) => {
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
        req.io.emit('audio-uploaded-channel1', { audioUrl, userId });
        //console.log('Evento emitido con éxito con el usuario:', id_user);
      } else {
        console.log('Socket.IO no disponible en la solicitud');
      }

      // Respuesta exitosa
      res.status(200).json({ success: true, audioUrl });
    } catch (error) {
      console.error('Error al procesar la solicitud:', error);

      // Revertir la transacción
      await new Promise((resolve) => {
        connection.rollback(() => {
          console.log('Transacción revertida');
          resolve(null);
        });
      });

      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }
);



router.delete('/delete-audios', async (req, res) => {
  const directory = path.join(__dirname, '../../../dist/uploads/audio');

  try {
    console.log('Eliminando audios en el directorio:', directory);

    // Verificar si el directorio existe
    if (!fs.existsSync(directory)) {
      console.log('El directorio no existe, no hay archivos para eliminar.');
      return res.status(200).json({ success: true, message: 'No hay audios para eliminar.' });
    }

    // Leer los archivos en el directorio
    const files = await new Promise<string[]>((resolve, reject) => {
      fs.readdir(directory, (err:any, files:any) => {
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
      await new Promise((resolve, reject) => {
        fs.unlink(filePath, (err:any) => {
          if (err) {
            console.error(`Error al eliminar el archivo ${filePath}:`, err);
            return reject(err);
          }
          console.log(`Archivo eliminado correctamente: ${filePath}`);
          resolve(null);
        });
      });
    }

    console.log('Todos los audios han sido eliminados.');
    res.status(200).json({ success: true, message: 'Todos los audios han sido eliminados con éxito.' });
  } catch (error) {
    console.error('Error al eliminar los audios:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar los audios.', error });
  }
});

  
  
export default router;
