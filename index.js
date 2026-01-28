const express = require('express');
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const net = require('net');
const path = require('path');

const app = express();
app.use(cors());
app.set('trust proxy', true);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Function to find an available port
function findFreePort(startPort = 3000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try the next one
        findFreePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Get port: use environment variable if set, otherwise find a free port
async function getPort() {
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }
  return await findFreePort(3000);
}

// Load reasons from JSON
const reasons = JSON.parse(fs.readFileSync('./reasons.json', 'utf-8'));

// Rate limiter: 120 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  keyGenerator: (req, res) => {
    return req.headers['cf-connecting-ip'] || req.ip; // Fallback if header missing (or for non-CF)
  },
  message: { error: "Too many requests, please try again later. (120 reqs/min/IP)" }
});

app.use(limiter);

// Random rejection reason endpoint
app.get('/no', (req, res) => {
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  res.json({ reason });
});

// Start server
async function startServer() {
  const PORT = await getPort();
  app.listen(PORT, () => {
    console.log(`No-as-a-Service is running on port ${PORT}`);
  });
}

startServer();
