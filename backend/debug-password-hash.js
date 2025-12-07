// debug-password-hash.js
const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');

async function debugPassword() {
    console.log('🔍 Debugging Password Hash\n');
    
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
        
        const username = 'exact1765098697807';
        
        // 1. Get the stored hash
        const userResult = await connection.execute(
            'SELECT USER_ID, USERNAME, USER_PASSWORD FROM USER_ACCOUNT WHERE USERNAME = :username',
            [username]
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }
        
        const user = userResult.rows[0];
        const storedHash = user.USER_PASSWORD;
        
        console.log('User found:');
        console.log(`  USER_ID: ${user.USER_ID}`);
        console.log(`  USERNAME: ${user.USERNAME}`);
        console.log(`  PASSWORD_HASH: ${storedHash}`);
        console.log(`  Hash length: ${storedHash ? storedHash.length : 0}`);
        
        // 2. Analyze the hash
        console.log('\n🔑 Hash analysis:');
        console.log(`  Starts with $2a$: ${storedHash.startsWith('$2a$')}`);
        console.log(`  Starts with $2b$: ${storedHash.startsWith('$2b$')}`);
        console.log(`  Starts with $2y$: ${storedHash.startsWith('$2y$')}`);
        console.log(`  Hash format: ${storedHash.substring(0, 30)}...`);
        
        // 3. Test bcrypt with the password we think was used
        console.log('\n🧪 Testing bcrypt compare:');
        
        const testPasswords = [
            'test123',      // What we think was used
            'Test123',      // With capital T
            'test123!',     // With exclamation
            'Test123!',     // Capital T with exclamation
            'password',     // Common default
            '123456',       // Simple numeric
            'exact1765098697807',  // Username as password
            ''              // Empty
        ];
        
        for (const testPassword of testPasswords) {
            try {
                const isValid = await bcrypt.compare(testPassword, storedHash);
                console.log(`  "${testPassword}": ${isValid ? '✅ MATCHES!' : '❌ no match'}`);
                if (isValid) {
                    console.log(`  🎉 FOUND CORRECT PASSWORD: "${testPassword}"`);
                    break;
                }
            } catch (error) {
                console.log(`  "${testPassword}": ❌ Error - ${error.message}`);
            }
        }
        
        // 4. Try to recreate the hash to see what it should be
        console.log('\n🔧 Testing hash recreation:');
        const testPassword = 'test123';
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log(`  New hash of "test123": ${newHash}`);
        console.log(`  New hash length: ${newHash.length}`);
        console.log(`  Matches stored hash: ${newHash === storedHash}`);
        
        // 5. Check if hash might be truncated
        console.log('\n📏 Checking for truncation:');
        if (storedHash.length < 50) {
            console.log(`  ⚠️  Hash is only ${storedHash.length} chars - might be truncated!`);
            console.log(`  Expected: ~60 characters for bcrypt hash`);
        }
        
        await connection.close();
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

debugPassword();