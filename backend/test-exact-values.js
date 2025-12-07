// test-exact-values.js
const axios = require('axios');
const oracledb = require('oracledb');

async function testExact() {
    console.log('🎯 Testing with exact values\n');
    
    const timestamp = Date.now();
    const testData = {
        Name: `Exact Test ${timestamp}`,
        Email: `exact${timestamp}@test.com`,
        Username: `exact${timestamp}`,
        Password: 'test123',
        Contact_No: '03002222222',
        Age: 28,
        Address: 'Exact Test Address'
    };
    
    console.log('Sending to API:', JSON.stringify(testData, null, 2));
    
    try {
        // 1. Call API
        const response = await axios.post('http://localhost:3000/api/auth/register', testData);
        console.log('\nAPI Response:', JSON.stringify(response.data, null, 2));
        
        // 2. Check database directly
        const connection = await oracledb.getConnection({
            user: 'c##ngouser',
            password: '123',
            connectString: 'localhost:1521/iba'
        });
        
        console.log('\n🔍 Checking database...');
        
        // Check PERSON table
        const personCheck = await connection.execute(
            `SELECT PERSON_ID, NAME, EMAIL, AGE, CONTACT_NO, ADDRESS 
             FROM PERSON 
             WHERE EMAIL = :email`,
            [testData.Email]
        );
        
        if (personCheck.rows.length > 0) {
            console.log('✅ Person found in database:');
            console.log('   ID:', personCheck.rows[0].PERSON_ID);
            console.log('   Name:', personCheck.rows[0].NAME);
            console.log('   Email:', personCheck.rows[0].EMAIL);
            
            // Check USER_ACCOUNT
            const userCheck = await connection.execute(
                `SELECT USER_ID, USERNAME, USER_PASSWORD, IS_ACTIVE 
                 FROM USER_ACCOUNT 
                 WHERE PERSON_ID = :personId`,
                [personCheck.rows[0].PERSON_ID]
            );
            
            if (userCheck.rows.length > 0) {
                console.log('✅ User found in database:');
                console.log('   User ID:', userCheck.rows[0].USER_ID);
                console.log('   Username:', userCheck.rows[0].USERNAME);
                console.log('   Is Active:', userCheck.rows[0].IS_ACTIVE);
                
                // Try login with API
                console.log('\n🔐 Testing login...');
                const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
                    Username: testData.Username,
                    Password: testData.Password
                });
                console.log('Login result:', loginResponse.data.success ? '✅ SUCCESS' : '❌ FAILED');
                
            } else {
                console.log('❌ User NOT found in USER_ACCOUNT table');
            }
        } else {
            console.log('❌ Person NOT found in PERSON table');
            console.log('This means the insert failed or was rolled back');
        }
        
        await connection.close();
        
    } catch (error) {
        console.log('\n❌ Error:', error.response?.data || error.message);
    }
}

testExact();