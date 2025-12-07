// diagnose-db-format.js
const db = require('./config/database');

async function diagnose() {
    console.log('🔍 Diagnosing Database Format Issue\n');
    
    const username = 'exact1765098697807';
    
    console.log(`1. Testing db.executeQuery with username: "${username}"`);
    
    const sql = 'SELECT * FROM USER_ACCOUNT WHERE USERNAME = :username';
    
    try {
        const result = await db.executeQuery(sql, [username]);
        
        console.log('Result:', {
            success: result.success,
            rowsLength: result.rows ? result.rows.length : 0,
            metaData: result.metaData ? 'Present' : 'Missing',
            isMock: result.rows && result.rows.length > 0 && result.rows[0].MESSAGE === 'Mock data' ? 'Yes' : 'No'
        });
        
        if (result.rows && result.rows.length > 0) {
            const row = result.rows[0];
            console.log('\n2. First row details:');
            console.log('Type:', typeof row);
            console.log('Is array?', Array.isArray(row));
            
            if (typeof row === 'object') {
                console.log('Keys:', Object.keys(row));
                console.log('Key types:', Object.keys(row).map(k => `${k}: ${typeof row[k]}`));
                
                // Check what properties exist
                console.log('\n3. Checking specific properties:');
                const checks = [
                    { prop: 'USER_ID', value: row.USER_ID },
                    { prop: 'USERNAME', value: row.USERNAME },
                    { prop: 'USER_PASSWORD', value: row.USER_PASSWORD ? '***' : 'NULL' },
                    { prop: 'IS_ACTIVE', value: row.IS_ACTIVE },
                    { prop: 'PERSON_ID', value: row.PERSON_ID }
                ];
                
                checks.forEach(check => {
                    console.log(`  ${check.prop}: ${check.value} (exists: ${check.prop in row})`);
                });
                
                // Try to access with different cases
                console.log('\n4. Trying different case variations:');
                const variations = [
                    'USER_ID', 'user_id', 'UserId', 'USERID',
                    'USERNAME', 'username', 'UserName',
                    'USER_PASSWORD', 'user_password', 'userPassword',
                    'IS_ACTIVE', 'is_active', 'isActive',
                    'PERSON_ID', 'person_id', 'personId'
                ];
                
                variations.forEach(variation => {
                    if (variation in row) {
                        console.log(`  ✅ "${variation}" exists:`, row[variation]);
                    }
                });
            }
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

diagnose();