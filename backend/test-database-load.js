// test-database-load.js
console.log('Testing database load without controllers...\n');

// Test database config directly
try {
    console.log('1. Loading database config...');
    const db = require('./src/config/database');
    console.log('✅ Database config loaded');
    
    // Check if it has the executeQuery method
    console.log('Has executeQuery:', typeof db.executeQuery === 'function');
    
} catch (error) {
    console.log('❌ Error loading database config:', error.message);
    
    // Check for Oracle client errors
    if (error.message.includes('DPI-1047')) {
        console.log('\n💡 Oracle Client not found. You need Oracle Instant Client.');
        console.log('Download from: https://www.oracle.com/database/technologies/instant-client/downloads.html');
        console.log('Extract to: C:\\instantclient_21_12');
        console.log('Or use mock mode by modifying database.js');
    }
    
    if (error.message.includes('ORA-01017')) {
        console.log('\n💡 Invalid username/password. Check your .env file.');
        console.log('DB_USER:', process.env.DB_USER);
        console.log('Password is set:', !!process.env.DB_PASSWORD);
    }
}