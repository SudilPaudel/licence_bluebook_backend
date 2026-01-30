require('dotenv').config();
const http = require('http');
const app = require('./src/config/express.config'); // your Express app
const listEndpoints = require('express-list-endpoints');

const PORT = process.env.PORT || 9005;

// ✅ Print routes
// console.log("✅ Registered Routes:");
// console.table(listEndpoints(app));

// ✅ Create and run the server
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log("🔴 Press CTRL + C to stop the server");
});
