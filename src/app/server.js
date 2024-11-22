const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
const dbClientes = [
  { host: '54.163.190.140', user: 'sistema', password: '', database: 'exospetrol_premia', port: '3306' }
];
// Create a connection pool
const pool = mysql.createPool({
  host: '54.163.190.140', // Replace with your MySQL server IP
  user: 'sistema',
  password: '',
  database: 'exospetrol_premia',
  connectionLimit: 10 // Set a limit for the pool
});

// Check the connection pool
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
  } else {
    console.log('Connected to MySQL');
    connection.release(); // Release the connection back to the pool
  }
});
function createConnection(config) {
  return mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port
  });
}

app.get('/premia/:sucursal', (req, res) => {
  const sucursal = req.params.sucursal;
  
  const ganadoresQuery = `
   SELECT 
      r.ticket,
      p.nombre, 
      p.telefono, 
      p.direccion,
      p.cedula,
      IF(r.sucursal='ERF','Rio Frio', 
         IF(r.sucursal='EHO','Horquetas', 
            IF(r.sucursal='EPO','Poasito',
               IF(r.sucursal='ELC','Los Chiles','')))) AS estacion
    FROM registro r
    INNER JOIN participante p ON p.id = r.id_participante
    WHERE r.activado = 1 AND r.sucursal = ?
    ORDER BY RAND()
    LIMIT 12;
  `;
  
  const premiosQuery = `
    SELECT id, premio 
    FROM premio 
    WHERE estado = 1 
    LIMIT 12;
  `;
  
  const dbConfig = dbClientes[0]; 
  const connection = mysql.createConnection(dbConfig);
  
  connection.connect(error => {
    if (error) {
      res.status(500).send(`Error de conexión (${dbConfig.name}): ${error.message}`);
      return;
    }
    
    // Obtener 12 ganadores aleatorios
    connection.query(ganadoresQuery, [sucursal], (err, ganadores) => {
      if (err || ganadores.length === 0) {
        connection.end();
        res.status(404).send('No se encontraron ganadores para esta sucursal.');
        return;
      }
      
      // Obtener 12 premios disponibles
      connection.query(premiosQuery, (err, premios) => {
        if (err || premios.length < 12) {
          connection.end();
          res.status(404).send('No hay suficientes premios disponibles.');
          return;
        }
        
        const resultado = [];
        
        // Asignar un premio a cada ganador
        for (let i = 0; i < 12; i++) {
          const ganador = ganadores[i];
          const premio = premios[i];
          
          // Devolver el ganador con el premio asignado
          const premioAsignado = {
            ...ganador,
            premio: premio.premio,
          };
          resultado.push(premioAsignado);
        }
        
        connection.end();
        res.json(resultado); // Enviar los ganadores con sus premios asignados
      });
    });
  });
});




app.post('/premia/asignar', (req, res) => {
  const { nombre, ticket, sucursal, tipo, premioNombre } = req.body;

  // Consulta para insertar el ganador con el premio asignado
  const insertGanadorQuery = `
    INSERT INTO ganador (nombre, ticket, estacion, tipo, premio)
    VALUES (?, ?, ?, ?, ?);
  `;

  const dbConfig = dbClientes[0];
  const connection = createConnection(dbConfig);

  connection.connect((error) => {
    if (error) {
      res.status(500).send(`Connection error (${dbConfig.name}): ${error.message}`);
    } else {
      // Insertar el ganador con el premio asignado
      connection.query(insertGanadorQuery, [nombre, ticket, sucursal, tipo, premioNombre], (err) => {
        connection.end();
        if (err) {
          res.status(500).send('Error al guardar ganador.');
        } else {
          res.status(200).json({
            mensaje: 'Ganador registrado con éxito.',
            premio: premioNombre,
          });
        }
      });
    }
  });
});


// Start the server
const PORT = process.env.PORT || 3011;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});