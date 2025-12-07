// debug-oracle-connection.js
require('dotenv').config();
const oracledb = require('oracledb');

console.log('🔍 DEBUGGING ORACLE CONNECTION ISSUE\n');

async function debugConnection() {
    console.log('='.repeat(60));
    console.log('1. Environment Variables');
    console.log('='.repeat(60));
    
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-3) : 'NOT SET');
    console.log('DB_CONNECTION_STRING:', process.env.DB_CONNECTION_STRING);
    console.log('ORACLE_CLIENT_PATH:', process.env.ORACLE_CLIENT_PATH || 'Not set');
    console.log('ORACLE_HOME:', process.env.ORACLE_HOME || 'Not set');
    
    console.log('\n' + '='.repeat(60));
    console.log('2. Testing Oracle Client');
    console.log('='.repeat(60));
    
    try {
        // Try to initialize Oracle Client
        oracledb.initOracleClient();
        console.log('✅ Oracle Client initialized (auto-detected)');
    } catch (err) {
        console.log('❌ Oracle Client auto-init failed:', err.message);
        
        // Try manual paths
        const possiblePaths = [
            'C:\\Oracle19c\\bin',
            'C:\\WINDOWS.X64_193000_db_home\\bin',
            'C:\\app\\client\\oracle\\instantclient_19_*',
            'C:\\oracle\\instantclient_19_*',
            process.env.ORACLE_HOME ? `${process.env.ORACLE_HOME}\\bin` : null
        ].filter(Boolean);
        
        console.log('\n🔧 Trying manual paths...');
        let clientFound = false;
        
        for (const path of possiblePaths) {
            try {
                oracledb.initOracleClient({ libDir: path });
                console.log(`✅ Oracle Client found at: ${path}`);
                clientFound = true;
                break;
            } catch (e) {
                console.log(`   ❌ ${path}: ${e.message}`);
            }
        }
        
        if (!clientFound) {
            console.log('\n🔴 Oracle Client NOT FOUND!');
            console.log('\n💡 Download Oracle Instant Client 19c:');
            console.log('https://www.oracle.com/database/technologies/instant-client/downloads.html');
            console.log('\n💡 After installing, add to .env:');
            console.log('ORACLE_CLIENT_PATH=C:\\path\\to\\instantclient_19_xx');
            return;
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('3. Testing Database Connection');
    console.log('='.repeat(60));
    
    const connectionConfigs = [
        { connectString: 'localhost:1521/iba', desc: 'Primary (with port)' },
        { connectString: 'localhost/iba', desc: 'Without port' },
        { connectString: 'localhost:1521/orclpdb', desc: 'PDB name' },
        { connectString: 'localhost/orclpdb', desc: 'PDB without port' }
    ];
    
    for (const config of connectionConfigs) {
        console.log(`\nTrying: ${config.desc}`);
        console.log(`Connect String: ${config.connectString}`);
        
        try {
            const connection = await oracledb.getConnection({
                user: process.env.DB_USER || 'c##ngouser',
                password: process.env.DB_PASSWORD || '123',
                connectString: config.connectString
            });
            
            // Test query
            const result = await connection.execute('SELECT USER FROM DUAL');
            console.log(`✅ SUCCESS! Connected as: ${result.rows[0].USER}`);
            
            // Check tables
            const tables = await connection.execute(`
                SELECT table_name 
                FROM user_tables 
                WHERE table_name IN ('USERS', 'PERSON')
            `);
            
            if (tables.rows.length > 0) {
                console.log(`📊 Found tables: ${tables.rows.map(t => t.TABLE_NAME).join(', ')}`);
            } else {
                console.log('⚠️ No USERS or PERSON tables found');
            }
            
            await connection.close();
            
            console.log('\n💡 Update your .env with:');
            console.log(`DB_CONNECTION_STRING=${config.connectString}`);
            
            return; // Stop on first success
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            
            if (error.message.includes('ORA-01017')) {
                console.log('   Wrong username/password');
            } else if (error.message.includes('ORA-12154')) {
                console.log('   Invalid connect string');
            }
        }
    }
    
    console.log('\n🔴 All connection attempts failed!');
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Test with SQL*Plus first:');
    console.log('   sqlplus c##ngouser/123@localhost:1521/iba');
    console.log('\n2. Check Oracle service is running:');
    console.log('   services.msc (look for OracleServiceIBA)');
    console.log('\n3. Check listener:');
    console.log('   lsnrctl status');
}

debugConnection().catch(console.error);