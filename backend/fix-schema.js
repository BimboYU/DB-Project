const oracledb = require('oracledb');

async function fixSchema() {
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        console.log('🔧 Fixing database schema...\n');
        
        // 1. Increase password column size
        console.log('1. Increasing USER_PASSWORD column size...');
        try {
            await connection.execute(`
                ALTER TABLE USER_ACCOUNT MODIFY (USER_PASSWORD VARCHAR2(100))
            `);
            console.log('   ✅ USER_PASSWORD increased to VARCHAR2(100)');
        } catch (error) {
            if (error.message.includes('ORA-01442')) {
                console.log('   ⚠️ Column already modified or does not exist');
            } else {
                console.log('   ❌ Error:', error.message);
            }
        }
        
        // 2. Check PERSON table structure
        console.log('\n2. Checking PERSON table...');
        const personDesc = await connection.execute(`
            SELECT column_name, data_type, data_length, nullable
            FROM user_tab_columns
            WHERE table_name = 'PERSON'
            ORDER BY column_id
        `);
        
        console.log('   PERSON table columns:');
        personDesc.rows.forEach(row => {
            console.log(`   - ${row[0]}: ${row[1]}(${row[2]}) ${row[3] === 'Y' ? 'NULL' : 'NOT NULL'}`);
        });
        
        // 3. Check sequences
        console.log('\n3. Checking sequences...');
        const sequences = await connection.execute(`
            SELECT sequence_name, last_number, increment_by
            FROM user_sequences
            WHERE sequence_name LIKE '%PERSON%' 
               OR sequence_name LIKE '%USER%' 
               OR sequence_name LIKE '%DONOR%'
            ORDER BY sequence_name
        `);
        
        if (sequences.rows.length === 0) {
            console.log('   ❌ No sequences found! Creating them...');
            
            // Create sequences
            await connection.execute(`
                CREATE SEQUENCE PERSON_SEQ START WITH 1 INCREMENT BY 1
            `);
            await connection.execute(`
                CREATE SEQUENCE USER_ACCOUNT_SEQ START WITH 1 INCREMENT BY 1
            `);
            await connection.execute(`
                CREATE SEQUENCE DONOR_SEQ START WITH 1 INCREMENT BY 1
            `);
            
            console.log('   ✅ Created sequences');
        } else {
            console.log('   ✅ Sequences found:');
            sequences.rows.forEach(row => {
                console.log(`   - ${row[0]}: Last# ${row[1]}, Inc by ${row[2]}`);
            });
        }
        
        // 4. Create trigger for auto-increment if needed
        console.log('\n4. Checking for triggers...');
        const triggers = await connection.execute(`
            SELECT trigger_name, table_name, triggering_event
            FROM user_triggers
            WHERE table_name IN ('PERSON', 'USER_ACCOUNT', 'DONOR')
        `);
        
        if (triggers.rows.length === 0) {
            console.log('   ⚠️ No triggers found. Manual ID insertion required.');
        } else {
            console.log('   ✅ Triggers found:');
            triggers.rows.forEach(row => {
                console.log(`   - ${row[0]} on ${row[1]} (${row[2]})`);
            });
        }
        
        await connection.close();
        
        console.log('\n🎉 Schema check complete!');
        console.log('\nNext steps:');
        console.log('1. Restart server');
        console.log('2. Test registration again');
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

fixSchema();