// debug-database-access.js
const oracledb = require('oracledb');

async function debugDatabaseAccess() {
    console.log('🔍 Debugging Database Access\n');
    
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        // Test 1: Direct query with default settings
        console.log('1. Testing direct query...');
        const email = 'exact1765098697807@test.com';
        
        const result = await connection.execute(
            `SELECT PERSON_ID, NAME, EMAIL, AGE, CONTACT_NO, ADDRESS 
             FROM PERSON 
             WHERE EMAIL = :email`,
            [email]
        );
        
        console.log('Result metadata:', result.metaData);
        console.log('Number of rows:', result.rows.length);
        
        if (result.rows.length > 0) {
            console.log('Row data (array format):', result.rows[0]);
            console.log('Row length:', result.rows[0].length);
            
            // Try accessing by index
            console.log('\nAccessing by index:');
            console.log('  result.rows[0][0]:', result.rows[0][0]);
            console.log('  result.rows[0][1]:', result.rows[0][1]);
            console.log('  result.rows[0][2]:', result.rows[0][2]);
        }
        
        // Test 2: Query with object format
        console.log('\n2. Testing query with object format...');
        const result2 = await connection.execute(
            `SELECT PERSON_ID, NAME, EMAIL, AGE, CONTACT_NO, ADDRESS 
             FROM PERSON 
             WHERE EMAIL = :email`,
            [email],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        console.log('Result metadata:', result2.metaData);
        console.log('Number of rows:', result2.rows.length);
        
        if (result2.rows.length > 0) {
            console.log('Row data (object format):', result2.rows[0]);
            console.log('\nAccessing by property name:');
            console.log('  result2.rows[0].PERSON_ID:', result2.rows[0].PERSON_ID);
            console.log('  result2.rows[0].NAME:', result2.rows[0].NAME);
            console.log('  result2.rows[0].EMAIL:', result2.rows[0].EMAIL);
            
            // Try all possible case variations
            console.log('\nTrying different case variations:');
            console.log('  .person_id:', result2.rows[0].person_id);
            console.log('  .Person_Id:', result2.rows[0].Person_Id);
            console.log('  .PERSONID:', result2.rows[0].PERSONID);
            console.log('  .personId:', result2.rows[0].personId);
        }
        
        // Test 3: Count all records
        console.log('\n3. Counting all records...');
        const countResult = await connection.execute(
            'SELECT COUNT(*) as total FROM PERSON'
        );
        console.log('Total PERSON records:', countResult.rows[0][0]);
        
        // Test 4: Show all records
        console.log('\n4. Showing all PERSON records...');
        const allRecords = await connection.execute(
            'SELECT PERSON_ID, NAME, EMAIL FROM PERSON ORDER BY PERSON_ID DESC',
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (allRecords.rows.length > 0) {
            console.log(`Found ${allRecords.rows.length} records:`);
            allRecords.rows.forEach((row, index) => {
                console.log(`  ${index + 1}. ID: ${row.PERSON_ID}, Name: ${row.NAME}, Email: ${row.EMAIL}`);
            });
        } else {
            console.log('No records found!');
        }
        
        await connection.close();
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

debugDatabaseAccess();