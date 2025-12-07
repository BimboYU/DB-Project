// assign-admin-role.js
const oracledb = require('oracledb');

async function assignAdminRole() {
    console.log('👑 Assigning Admin Role\n');
    
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
        
        // Get user ID
        const username = 'final1765100133840';
        const userResult = await connection.execute(
            'SELECT USER_ID FROM USER_ACCOUNT WHERE USERNAME = :username',
            [username]
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const userId = userResult.rows[0].USER_ID;
        console.log(`Found user: ID = ${userId}, Username = ${username}`);
        
        // Check if user already has roles
        const existingRoles = await connection.execute(`
            SELECT r.ROLE_NAME 
            FROM USER_ROLE ur
            JOIN ROLE r ON ur.ROLE_ID = r.ROLE_ID
            WHERE ur.USER_ID = :userId
        `, [userId]);
        
        if (existingRoles.rows.length > 0) {
            console.log('\nUser already has roles:');
            existingRoles.rows.forEach(role => {
                console.log(`  - ${role.ROLE_NAME}`);
            });
        } else {
            console.log('\nUser has no roles assigned');
        }
        
        // Assign Admin role (ROLE_ID = 1)
        console.log('\nAssigning Admin role...');
        try {
            await connection.execute(
                'INSERT INTO USER_ROLE (USER_ID, ROLE_ID) VALUES (:userId, :roleId)',
                { userId: userId, roleId: 1 },
                { autoCommit: true }
            );
            console.log('✅ Admin role assigned successfully!');
        } catch (error) {
            if (error.message.includes('ORA-00001')) {
                console.log('⚠️  User already has this role');
            } else {
                console.log('❌ Error assigning role:', error.message);
            }
        }
        
        // Also assign Staff role (ROLE_ID = 2) for testing
        console.log('\nAssigning Staff role...');
        try {
            await connection.execute(
                'INSERT INTO USER_ROLE (USER_ID, ROLE_ID) VALUES (:userId, :roleId)',
                { userId: userId, roleId: 2 },
                { autoCommit: true }
            );
            console.log('✅ Staff role assigned successfully!');
        } catch (error) {
            if (error.message.includes('ORA-00001')) {
                console.log('⚠️  User already has this role');
            } else {
                console.log('❌ Error assigning role:', error.message);
            }
        }
        
        // Verify roles
        console.log('\n🔍 Verifying assigned roles...');
        const finalRoles = await connection.execute(`
            SELECT r.ROLE_ID, r.ROLE_NAME 
            FROM USER_ROLE ur
            JOIN ROLE r ON ur.ROLE_ID = r.ROLE_ID
            WHERE ur.USER_ID = :userId
            ORDER BY r.ROLE_ID
        `, [userId]);
        
        console.log(`User now has ${finalRoles.rows.length} roles:`);
        finalRoles.rows.forEach(role => {
            console.log(`  ${role.ROLE_ID}: ${role.ROLE_NAME}`);
        });
        
        await connection.close();
        
        console.log('\n🎉 Role assignment complete!');
        console.log('\nNow test the protected endpoint again.');
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

assignAdminRole();