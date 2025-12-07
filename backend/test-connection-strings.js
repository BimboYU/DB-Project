// test-connection-strings.js
const oracledb = require('oracledb');

const connectionStrings = [
    'localhost:1521/iba',
    'localhost/iba', 
    'localhost:1521/orclpdb',
    'localhost/orclpdb',
    'iba',
    '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=iba)))'
];

async function testConnections() {
    console.log('🔗 TESTING DIFFERENT CONNECTION STRINGS\n');
    
    for (const connectString of connectionStrings) {
        console.log(`\nTrying: ${connectString}`);
        
        try {
            const connection = await oracledb.getConnection({
                user: 'c##ngouser',
                password: '123',
                connectString: connectString
            });
            
            // Test query
            const result = await connection.execute(`
                SELECT USER as username, 
                       SYS_CONTEXT('USERENV', 'CON_NAME') as container,
                       SYS_CONTEXT('USERENV', 'DB_NAME') as database
                FROM DUAL
            `);
            
            console.log(`✅ SUCCESS!`);
            console.log(`   User: ${result.rows[0].USERNAME}`);
            console.log(`   Container: ${result.rows[0].CONTAINER}`);
            console.log(`   Database: ${result.rows[0].DATABASE}`);
            
            await connection.close();
            
            console.log('\n💡 Use this in your .env:');
            console.log(`DB_CONNECTION_STRING=${connectString}`);
            
            return connectString; // Stop on first success
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message.substring(0, 80)}`);
        }
    }
    
    return null;
}

testConnections().then(workingString => {
    if (workingString) {
        console.log('\n🎉 Found working connection string!');
    } else {
        console.log('\n🔴 No connection strings worked');
        console.log('\n🔧 Try checking tnsnames.ora:');
        console.log('C:\\WINDOWS.X64_193000_db_home\\network\\admin\\tnsnames.ora');
    }
});