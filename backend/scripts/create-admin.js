const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysqlPool = require('../config/db');
const usersStore = require('../storage/usersStore');

function parseArguments(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (!['--username', '--email', '--password'].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    if (!value) {
      throw new Error(`${argument} requires a value.`);
    }

    options[argument.slice(2)] = value;
    index += 1;
  }

  if (!options.username || !options.email || !options.password) {
    throw new Error('Usage: --username NAME --email EMAIL --password PASSWORD');
  }
  if (options.username.length > 50) {
    throw new Error('Username must be 50 characters or fewer.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email)) {
    throw new Error('Email format is invalid.');
  }
  if (options.password.length < 12) {
    throw new Error('Admin password must be at least 12 characters.');
  }

  return options;
}

async function ensureMysqlRoleColumn() {
  if (await usersStore.getMode() !== 'mysql') return;

  const [columns] = await mysqlPool.query(
    "SHOW COLUMNS FROM `USER` LIKE 'role'"
  );
  if (columns.length === 0) {
    await mysqlPool.query(
      `ALTER TABLE \`USER\`
       ADD COLUMN role ENUM('user', 'admin')
       NOT NULL DEFAULT 'user'
       AFTER profile_image_url`
    );
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  await ensureMysqlRoleColumn();
  const passwordHash = await usersStore.createPasswordHash(options.password);
  const admin = await usersStore.createOrUpdateAdmin({
    username: options.username,
    email: options.email,
    passwordHash,
  });
  const mode = await usersStore.getMode();

  console.log(`Admin account saved in ${mode} mode.`);
  console.log(`id=${admin.user_id} email=${admin.email} role=${admin.role}`);
}

main()
  .catch((error) => {
    console.error(`Admin account creation failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mysqlPool.end();
  });
