// check-tables.js
const oracledb = require('oracledb');

async function checkTables() {
    console.log('🗄️ Checking Database Tables\n');
    
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
        
        // Get all tables
        const tables = await connection.execute(`
            SELECT table_name, num_rows 
            FROM user_tables 
            ORDER BY table_name
        `);
        
        console.log('📊 ALL TABLES IN DATABASE:');
        console.log('==========================');
        
        let hasAllTables = true;
        const requiredTables = [
            'PERSON', 'USER_ACCOUNT', 'DONOR', 'ROLE', 'USER_ROLE',
            'CAMPAIGN', 'DONATION', 'IN_KIND_DONATION', 'VOLUNTEER',
            'VOLUNTEER_HOURS', 'INTERN', 'STAFF_JOB', 'BENEFICIARY',
            'BENEFICIARY_DEPENDENTS', 'ASSISTANCE_RECORD', 'EXPENSE',
            'AUDIT_LOG'
        ];
        
        tables.rows.forEach((table, index) => {
            console.log(`${index + 1}. ${table.TABLE_NAME} - ${table.NUM_ROWS || 0} rows`);
        });
        
        console.log('\n🔍 CHECKING REQUIRED TABLES:');
        console.log('============================');
        
        requiredTables.forEach(table => {
            const exists = tables.rows.some(t => t.TABLE_NAME === table);
            if (exists) {
                console.log(`✅ ${table}`);
            } else {
                console.log(`❌ ${table} - MISSING!`);
                hasAllTables = false;
            }
        });
        
        if (!hasAllTables) {
            console.log('\n⚠️  Some tables are missing!');
            console.log('Run the complete-schema.sql to create missing tables.');
        } else {
            console.log('\n🎉 All required tables exist!');
        }
        
        // Check sample data in CAMPAIGN table
        console.log('\n🔍 Checking CAMPAIGN table data:');
        try {
            const campaignData = await connection.execute(
                'SELECT CAMPAIGN_ID, CAMPAIGN_NAME, STATUS FROM CAMPAIGN'
            );
            
            if (campaignData.rows.length > 0) {
                console.log(`Found ${campaignData.rows.length} campaigns:`);
                campaignData.rows.forEach(campaign => {
                    console.log(`  ${campaign.CAMPAIGN_ID}: ${campaign.CAMPAIGN_NAME} (${campaign.STATUS})`);
                });
            } else {
                console.log('No campaigns found in database');
            }
        } catch (error) {
            console.log('Cannot query CAMPAIGN table:', error.message);
        }
        
        await connection.close();
        
    } catch (error) {
        console.log('❌ Database error:', error.message);
    }
}

checkTables();