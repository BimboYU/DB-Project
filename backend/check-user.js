// check-user-account.js
const oracledb = require('oracledb');

async function checkUserAccount() {
    console.log('🔍 Checking USER_ACCOUNT table\n');
    
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
        
        // 1. Check all users
        const allUsers = await connection.execute(
            'SELECT * FROM USER_ACCOUNT ORDER BY USER_ID'
        );
        
        console.log(`Total USER_ACCOUNT records: ${allUsers.rows.length}`);
        
        if (allUsers.rows.length > 0) {
            console.log('\nAll USER_ACCOUNT records:');
            allUsers.rows.forEach((row, i) => {
                console.log(`\nUser ${i + 1}:`);
                console.log(`  USER_ID: ${row.USER_ID}`);
                console.log(`  PERSON_ID: ${row.PERSON_ID}`);
                console.log(`  USERNAME: ${row.USERNAME}`);
                console.log(`  IS_ACTIVE: ${row.IS_ACTIVE}`);
                console.log(`  CREATED_DATE: ${row.CREATED_DATE}`);
                console.log(`  LAST_LOGIN: ${row.LAST_LOGIN}`);
            });
        } else {
            console.log('❌ No users found in USER_ACCOUNT table!');
        }
        
        // 2. Check foreign key relationships
        console.log('\n2. Checking PERSON records without USER_ACCOUNT...');
        const orphanedPersons = await connection.execute(`
            SELECT p.PERSON_ID, p.NAME, p.EMAIL
            FROM PERSON p
            LEFT JOIN USER_ACCOUNT u ON p.PERSON_ID = u.PERSON_ID
            WHERE u.USER_ID IS NULL
            ORDER BY p.PERSON_ID
        `);
        
        if (orphanedPersons.rows.length > 0) {
            console.log(`Found ${orphanedPersons.rows.length} PERSON records without USER_ACCOUNT:`);
            orphanedPersons.rows.forEach(row => {
                console.log(`  ID: ${row.PERSON_ID}, Name: ${row.NAME}, Email: ${row.EMAIL}`);
            });
        }
        
        // 3. Check sequences
        console.log('\n3. Checking sequences...');
        const userSeq = await connection.execute(
            'SELECT SEQ_USER_ID.NEXTVAL as next_user_id FROM DUAL'
        );
        console.log(`Next USER_ID sequence value: ${userSeq.rows[0].NEXT_USER_ID}`);
        
        const personSeq = await connection.execute(
            'SELECT SEQ_PERSON_ID.NEXTVAL as next_person_id FROM DUAL'
        );
        console.log(`Next PERSON_ID sequence value: ${personSeq.rows[0].NEXT_PERSON_ID}`);
        
        await connection.close();
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

checkUserAccount();