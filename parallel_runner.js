const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const BRUTE_SCRIPT = path.resolve(__dirname, 'mineflayer_brute.js');
const PROXIES_FILE = path.resolve(__dirname, 'proxies.txt');

// Ensure proxies file exists
if (!fs.existsSync(PROXIES_FILE)) {
    console.log('Creating proxies.txt template...');
    fs.writeFileSync(PROXIES_FILE, 'socks5h://127.0.0.1:9050\n');
    console.log('Please edit proxies.txt to add your proxy list');
    process.exit(1);
}

// Load proxies
const proxies = fs
    .readFileSync(PROXIES_FILE, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#')); // Filter out empty lines and comments

if (proxies.length === 0) {
    console.error('No proxies found in proxies.txt');
    process.exit(1);
}

console.log(`Loaded ${proxies.length} proxies from proxies.txt`);

// Calculate total workers (proxies + direct)
const totalWorkers = proxies.length + 1;
console.log(`Total workers: ${totalWorkers}`);

// Track active workers
const workers = new Map();

// Function to spawn a worker
function spawnWorker(proxy, workerId) {
    const env = { 
        ...process.env, 
        PROXY: proxy, 
        WORKER_ID: workerId,
        WORKER_COUNT: totalWorkers
    };
    
    const worker = fork(BRUTE_SCRIPT, [], { env });
    
    console.log(`Spawned worker #${workerId} → ${proxy}`);
    
    worker.on('exit', (code, signal) => {
        console.log(`Worker #${workerId} exited with code ${code}${signal ? ` (signal: ${signal})` : ''}`);
        workers.delete(workerId);
        
        // Optionally restart the worker
        if (code !== 0) {
            console.log(`Restarting worker #${workerId}...`);
            setTimeout(() => spawnWorker(proxy, workerId), 5000);
        }
    });
    
    worker.on('error', (error) => {
        console.error(`Worker #${workerId} error:`, error);
    });
    
    workers.set(workerId, worker);
}

// Spawn workers for each proxy
proxies.forEach((proxy, idx) => {
    spawnWorker(proxy, idx);
});

// Add a "direct" worker for mobile hotspot IP
const directEnv = { 
    ...process.env, 
    PROXY: '', 
    WORKER_ID: proxies.length,
    WORKER_COUNT: totalWorkers
};
const direct = fork(BRUTE_SCRIPT, [], { env: directEnv });
console.log(`Spawned "direct" worker #${proxies.length}`);
workers.set(proxies.length, direct);

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nShutting down workers...');
    workers.forEach((worker, id) => {
        console.log(`Terminating worker #${id}...`);
        worker.kill();
    });
    process.exit(0);
});

// Log worker status periodically
setInterval(() => {
    console.log(`\nActive workers: ${workers.size}`);
    workers.forEach((worker, id) => {
        console.log(`Worker #${id} is running`);
    });
}, 60000); // Log every minute 