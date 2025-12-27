const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Next.js development server in background...');

const server = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  shell: true,
  stdio: 'ignore',
  detached: true
});

server.unref();

console.log('Server started! PID:', server.pid);
console.log('Server is running at http://localhost:3000');
console.log('To stop the server, use: taskkill /F /PID ' + server.pid);

// Keep the script running
setTimeout(() => {}, 1000);























