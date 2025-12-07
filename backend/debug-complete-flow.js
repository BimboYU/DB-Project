// debug-complete-flow.js
const axios = require('axios');
const oracledb = require('oracledb');

const BASE_URL = 'http://localhost:3000';

async function testCompleteFlow() {
    console.log('🔍 Testing Complete Authentication Flow\n');
    
    const timestamp = Date.now();
    const testUser = {
        Name: `Complete Test ${timestamp}`,
        Email: `complete${timestamp}@test.com`,
        Username: `complete${timestamp}`,
        Password: 'Simple123', // Simple password for testing
        Contact_No: `0300${timestamp.toString().slice(-8)}`,
        Age: 25,
        Address: 'Complete Test Address'
    };
    
    console.log('1. Testing Registration...');
    console.log('Payload:', JSON.stringify(testUser, null, 2));
    
    try {
        // Step 1: Register
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
        console.log('\n✅ Registration successful!');
        console.log('Response:', JSON.stringify(registerResponse.data, null, 2));
        
        if (!registerResponse.data.success) {
            console.log('❌ Registration failed in response');
            return;
        }
        
        const userId = registerResponse.data.data.userId;
        const personId = registerResponse.data.data.personId;
        const token = registerResponse.data.data.token;
        
        // Step 2: Immediately verify in database
        console.log('\n2. Verifying Database Immediately...');
        await verifyDatabaseImmediately(testUser.Username, testUser.Email);
        
        // Small delay to ensure commits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Test login with the credentials
        console.log('\n3. Testing Login...');
        await testLogin(testUser.Username, testUser.Password);
        
        // Step 4: Test with the token from registration
        console.log('\n4. Testing Token from Registration...');
        await testWithToken(token);
        
    } catch (error) {
        console.log('\n❌ Error in flow:');
        console.log('Error message:', error.message);
        
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Response:', JSON.stringify(error.response.data, null, 2));
        }
        
        // Try direct database check
        console.log('\n5. Direct Database Check...');
        await directDatabaseCheck();
    }
}

async function verifyDatabaseImmediately(username, email) {
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        // Check USER_ACCOUNT
        const userResult = await connection.execute(
            `SELECT USER_ID, USERNAME, USER_PASSWORD, IS_ACTIVE, CREATED_AT 
             FROM USER_ACCOUNT 
             WHERE USERNAME = :username`,
            { username }
        );
        
        if (userResult.rows.length === 0) {
            console.log('   ❌ User NOT found in USER_ACCOUNT immediately after registration');
        } else {
            console.log('   ✅ User found in USER_ACCOUNT:');
            const user = userResult.rows[0];
            console.log(`     USER_ID: ${user[0]}`);
            console.log(`     USERNAME: ${user[1]}`);
            console.log(`     PASSWORD_HASH: ${user[2] ? user[2].substring(0, 30) + '...' : 'NULL'}`);
            console.log(`     IS_ACTIVE: ${user[3]}`);
            
            // Check PERSON table
            const personResult = await connection.execute(
                `SELECT PERSON_ID, NAME, EMAIL, AGE, CONTACT_NO 
                 FROM PERSON 
                 WHERE EMAIL = :email`,
                { email }
            );
            
            if (personResult.rows.length === 0) {
                console.log('   ❌ Person NOT found in PERSON table');
            } else {
                console.log('   ✅ Person found in PERSON table:');
                const person = personResult.rows[0];
                console.log(`     PERSON_ID: ${person[0]}`);
                console.log(`     NAME: ${person[1]}`);
                console.log(`     EMAIL: ${person[2]}`);
            }
        }
        
        await connection.close();
        
    } catch (error) {
        console.log('   ❌ Database check error:', error.message);
    }
}

async function testLogin(username, password) {
    try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            Username: username,
            Password: password
        });
        
        console.log('   ✅ Login successful!');
        console.log('   Token:', loginResponse.data.data.token.substring(0, 50) + '...');
        
        return loginResponse.data.data.token;
        
    } catch (error) {
        console.log('   ❌ Login failed:');
        
        if (error.response) {
            console.log('     Status:', error.response.status);
            console.log('     Message:', error.response.data.message);
            
            // Debug: Check what the actual password hash is
            await debugPassword(username, password);
        } else {
            console.log('     Error:', error.message);
        }
        return null;
    }
}

async function debugPassword(username, attemptedPassword) {
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        const result = await connection.execute(
            `SELECT USER_PASSWORD FROM USER_ACCOUNT WHERE USERNAME = :username`,
            { username }
        );
        
        if (result.rows.length > 0) {
            const storedHash = result.rows[0][0];
            console.log('\n   🔍 Password Debug:');
            console.log(`     Stored hash: ${storedHash}`);
            console.log(`     Hash length: ${storedHash ? storedHash.length : 0}`);
            console.log(`     Attempted password: "${attemptedPassword}"`);
            console.log(`     Hash starts with $2: ${storedHash ? storedHash.startsWith('$2') : false}`);
            
            // Try to verify manually
            const bcrypt = require('bcryptjs');
            if (storedHash && storedHash.startsWith('$2')) {
                const isValid = await bcrypt.compare(attemptedPassword, storedHash);
                console.log(`     Manual bcrypt.compare: ${isValid ? '✅ MATCHES' : '❌ DOES NOT MATCH'}`);
            }
        }
        
        await connection.close();
        
    } catch (error) {
        console.log('   ❌ Password debug error:', error.message);
    }
}

async function testWithToken(token) {
    try {
        const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('   ✅ Profile access successful!');
        console.log('   User:', profileResponse.data.data.user.username);
        
    } catch (error) {
        console.log('   ❌ Token invalid or expired:');
        console.log('     Status:', error.response?.status);
        console.log('     Message:', error.response?.data?.message);
    }
}

async function directDatabaseCheck() {
    try {
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        console.log('\n6. Direct Database Analysis:');
        
        // Count records
        const personCount = await connection.execute(`SELECT COUNT(*) FROM PERSON`);
        const userCount = await connection.execute(`SELECT COUNT(*) FROM USER_ACCOUNT`);
        
        console.log(`   PERSON records: ${personCount.rows[0][0]}`);
        console.log(`   USER_ACCOUNT records: ${userCount.rows[0][0]}`);
        
        // Show recent records
        const recentUsers = await connection.execute(`
            SELECT u.USERNAME, p.NAME, p.EMAIL, u.CREATED_AT
            FROM USER_ACCOUNT u
            JOIN PERSON p ON u.PERSON_ID = p.PERSON_ID
            ORDER BY u.CREATED_AT DESC
            FETCH FIRST 5 ROWS ONLY
        `);
        
        if (recentUsers.rows.length > 0) {
            console.log('\n   Recent users:');
            recentUsers.rows.forEach(row => {
                console.log(`     ${row[0]} - ${row[1]} (${row[2]}) - ${row[3]}`);
            });
        }
        
        await connection.close();
        
    } catch (error) {
        console.log('   ❌ Direct check error:', error.message);
    }
}

// Run the complete test
testCompleteFlow();