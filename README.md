# Minecraft Authentication Penetration Testing Tool

A Node.js-based penetration testing tool for analyzing Minecraft server authentication systems. This tool is designed for security research and testing purposes only.

## Features

- Multi-worker parallel processing
- Proxy support with SOCKS5
- Stealth features to avoid detection
- Comprehensive logging and reporting
- Version rotation
- Session management
- Anti-detection measures

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mc-tor-brute.git
cd mc-tor-brute
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create a `.env` file with your configuration:
```env
WORKER_ID=0
WORKER_COUNT=1
PROXY=socks5://username:password@host:port
```

2. Create your password list in `passwords.txt`

## Usage

Run the script with:
```bash
node mineflayer_brute.js
```

For parallel processing:
```bash
node parallel_runner.js
```

## Security Notice

This tool is for educational and security research purposes only. Always:
- Obtain proper authorization before testing
- Follow responsible disclosure practices
- Respect server terms of service
- Use only on systems you own or have permission to test

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests. 