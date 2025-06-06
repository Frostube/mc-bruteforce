/**
 * Password Manager for Minecraft Penetration Testing
 * 
 * This script manages password lists for targeted brute force attacks
 * based on the account type.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PASSWORD_LISTS = {
  general: 'passwords.txt',
  minecraft: 'minecraft_passwords.txt',
  admin: 'admin_mod_passwords.txt',
  combined: 'combined_passwords.txt'
};

// Create combined password list
function createCombinedList() {
  console.log('Creating combined password list...');
  
  // Read all password files
  const generalPasswords = fs.existsSync(PASSWORD_LISTS.general) 
    ? fs.readFileSync(PASSWORD_LISTS.general, 'utf8')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p && !p.startsWith('#'))
    : [];
  
  const minecraftPasswords = fs.existsSync(PASSWORD_LISTS.minecraft)
    ? fs.readFileSync(PASSWORD_LISTS.minecraft, 'utf8')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p && !p.startsWith('#'))
    : [];
    
  const adminPasswords = fs.existsSync(PASSWORD_LISTS.admin)
    ? fs.readFileSync(PASSWORD_LISTS.admin, 'utf8')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p && !p.startsWith('#'))
    : [];
  
  // Combine all passwords and remove duplicates
  const allPasswords = [...new Set([
    ...generalPasswords,
    ...minecraftPasswords,
    ...adminPasswords
  ])];
  
  // Write combined password list
  fs.writeFileSync(PASSWORD_LISTS.combined, allPasswords.join('\n'));
  
  console.log(`Total passwords: ${allPasswords.length}`);
  console.log(`  - General: ${generalPasswords.length}`);
  console.log(`  - Minecraft: ${minecraftPasswords.length}`);
  console.log(`  - Admin/Mod: ${adminPasswords.length}`);
  console.log(`Combined list saved to ${PASSWORD_LISTS.combined}`);
}

// Create targeted password list for a specific account
function createTargetedList(username, accountType = 'player') {
  console.log(`Creating targeted list for ${username} (${accountType})...`);
  
  // Base passwords to include
  const passwords = [];
  
  // Read passwords based on account type
  if (accountType === 'admin' || accountType === 'moderator' || accountType === 'staff') {
    const adminPasswords = fs.existsSync(PASSWORD_LISTS.admin)
      ? fs.readFileSync(PASSWORD_LISTS.admin, 'utf8')
          .split('\n')
          .map(p => p.trim())
          .filter(p => p && !p.startsWith('#'))
      : [];
    passwords.push(...adminPasswords);
  }
  
  // Always include minecraft passwords
  const minecraftPasswords = fs.existsSync(PASSWORD_LISTS.minecraft)
    ? fs.readFileSync(PASSWORD_LISTS.minecraft, 'utf8')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p && !p.startsWith('#'))
    : [];
  passwords.push(...minecraftPasswords);
  
  // Add username-based patterns
  const userPatterns = generateUsernamePatterns(username);
  passwords.push(...userPatterns);
  
  // Remove duplicates
  const uniquePasswords = [...new Set(passwords)];
  
  // Write targeted password list
  const targetFile = `${username}_passwords.txt`;
  fs.writeFileSync(targetFile, uniquePasswords.join('\n'));
  
  console.log(`Created targeted list with ${uniquePasswords.length} passwords for ${username}`);
  console.log(`Saved to ${targetFile}`);
  
  return targetFile;
}

// Generate patterns based on username
function generateUsernamePatterns(username) {
  const patterns = [
    username,
    `${username}123`,
    `${username}1234`,
    `${username}12345`,
    `${username}2023`,
    `${username}2024`,
    `${username}pass`,
    `${username}password`,
    `${username}pw`,
    `pass${username}`,
    `password${username}`,
    username.toLowerCase(),
    username.toUpperCase(),
    username.charAt(0).toUpperCase() + username.slice(1),
    username.split('').reverse().join(''),
    `${username}!`,
    `${username}!!`,
    `${username}!@#`,
    `${username}321`,
    `${username}cool`,
    `${username}best`,
    `${username}pro`,
    `${username}gaming`,
    `${username}gamer`,
    `${username}player`,
    `${username}mc`,
    `mc${username}`,
    `${username}craft`,
    `${username}mine`,
    `${username}server`,
    `${username}op`,
    `${username}admin`,
    `${username}mod`,
    `${username}staff`,
    `${username}owner`
  ];
  
  // Add year combinations
  for (let year = 1990; year <= 2024; year++) {
    patterns.push(`${username}${year}`);
  }
  
  return patterns;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'combine') {
    createCombinedList();
  } 
  else if (command === 'target') {
    const username = args[1];
    const accountType = args[2] || 'player';
    
    if (!username) {
      console.error('Error: Username required');
      console.log('Usage: node password_manager.js target <username> [accountType]');
      process.exit(1);
    }
    
    createTargetedList(username, accountType);
  }
  else {
    console.log('Minecraft Password Manager');
    console.log('=========================');
    console.log('Commands:');
    console.log('  combine              - Create combined password list');
    console.log('  target <username> [accountType] - Create targeted password list');
    console.log('\nAccount types: player, admin, moderator, staff');
  }
}

// Run the script
main(); 