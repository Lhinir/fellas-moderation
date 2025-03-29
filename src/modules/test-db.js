// test-db.js
const SQLite = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Define the database directory and path
const dbDir = path.resolve(__dirname, 'database');
const dbFile = path.join(dbDir, 'test.db');

console.log(`Testing database connection:`);
console.log(`Database directory: ${dbDir}`);
console.log(`Database file: ${dbFile}`);

// Ensure the directory exists
if (!fs.existsSync(dbDir)) {
  console.log(`Creating database directory: ${dbDir}`);
  fs.mkdirSync(dbDir, { recursive: true });
}

// Check write permissions
try {
  const testFile = path.join(dbDir, 'permission_test.txt');
  fs.writeFileSync(testFile, 'Testing write permissions');
  console.log('Directory is writable (permission test file created)');
  fs.unlinkSync(testFile);
  console.log('Permission test file removed');
} catch (error) {
  console.error('PERMISSION ERROR: Directory is not writable', error);
}

// Try to open the database
try {
  const db = new SQLite(dbFile);
  console.log('Database connection successful');
  
  // Create a simple table
  db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, value TEXT)');
  console.log('Created test table');
  
  // Insert data
  const insert = db.prepare('INSERT INTO test (value) VALUES (?)');
  const result = insert.run('Test value');
  console.log('Inserted data:', result);
  
  // Close connection
  db.close();
  console.log('Connection closed properly');
} catch (error) {
  console.error('DATABASE ERROR:', error);
}