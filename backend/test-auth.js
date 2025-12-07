// test-registration-fixed.js
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
    console.log('🔐 Testing Authentication Flow\n');
    
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    try {
        const health = await axios.get(`${BASE_URL}/health`);
        console.log('   ✅ Health check passed');
        console.log('   Response:', JSON.stringify(health.data, null, 2));
    } catch (error) {
        console.log('   ❌ Health check failed:', error.message);
        return;
    }
    
    // 2. Register a new user WITH CORRECT FIELD NAMES
    console.log('\n2. Testing registration...');
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 10000);
    
    const testUser = {
        Name: `Test User ${randomNum}`,        // Note: PascalCase!
        Email: `test${timestamp}@example.com`,
        Username: `user_${timestamp}_${randomNum}`,  // Note: PascalCase!
        Password: 'Test123!',
        Contact_No: `0300${randomNum}`,
        Address: '123 Test Street, Karachi',
        Age: 25
        // Role_ID is optional
    };
    
    console.log('   Sending payload:', JSON.stringify(testUser, null, 2));
    
    try {
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
        console.log('   ✅ Registration successful!');
        console.log('   Response:', JSON.stringify(registerResponse.data, null, 2));
        
        // 3. Test login with the same user
        console.log('\n3. Testing login...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            Username: testUser.Username,  // Note: PascalCase!
            Password: testUser.Password    // Note: PascalCase!
        });
        
        console.log('   ✅ Login successful!');
        console.log('   Token received (first 50 chars):', 
                   loginResponse.data.data.token.substring(0, 50) + '...');
        
        const token = loginResponse.data.data.token;
        
        // 4. Test protected endpoint
        console.log('\n4. Testing protected endpoint (/api/persons)...');
        const personsResponse = await axios.get(`${BASE_URL}/api/persons`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('   ✅ Access granted to protected endpoint!');
        console.log('   Response status:', personsResponse.status);
        console.log('   Number of persons:', personsResponse.data.data?.length || 0);
        
        // 5. Test profile endpoint
        console.log('\n5. Testing profile endpoint...');
        const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('   ✅ Profile retrieved!');
        console.log('   User:', profileResponse.data.data.user.username);
        console.log('   Name:', profileResponse.data.data.person?.NAME);
        
    } catch (error) {
        console.log('   ❌ Error:');
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('   Message:', error.message);
        }
    }
}

// Run the test
testAuth();