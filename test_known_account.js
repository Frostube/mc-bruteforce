const mineflayer = require('mineflayer');

const config = {
    host: 'join.6b6t.org',
    port: 25565,
    username: 'Frostubee',
    password: 'Pinata2002',
    version: '1.20.1',
    auth: 'offline'
};

console.log('Attempting to login with known credentials...');
console.log(`Username: ${config.username}`);
console.log(`Password: ${config.password}`);

const bot = mineflayer.createBot(config);

bot.once('login', () => {
    console.log('Successfully logged in!');
    bot.end();
});

bot.once('error', (err) => {
    console.error('Error occurred:', err.message);
});

bot.once('kicked', (reason) => {
    console.log('Kicked from server:', reason);
}); 