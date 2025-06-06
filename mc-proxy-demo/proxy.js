const mc = require('minecraft-protocol');
const PROXY = { bindPort: 25570 };
const TARGET = { host: 'join.6b6t.org', port: 25565 };

mc.createProxy({
  loginHandler: c => ({ username: c.username, uuid: c.uuid }),
  ...PROXY,
  destination: TARGET
})
.on('client', c => {
  console.log(`\x1b[33m[+] Client ${c.username}\x1b[0m`);
  c.on('packet', (d, m, s)=>console.log(
    `${s?'server':'client'}bound | ${m.name} ${str(d)}`));
})
.on('listening', ()=>console.log(
  `\x1b[32mProxy ready on localhost:${PROXY.bindPort}\x1b[0m`))
.on('error', console.error);

function str(o){const s=JSON.stringify(o);return s.length>120?s.slice(0,120)+'…':s;}
