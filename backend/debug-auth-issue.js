// debug-auth-issue.js
const axios = require('axios');

console.log('🔍 DEBUGGING AUTHENTICATION ISSUE\n');

async function debug() {
    console.log('='.repeat(60));
    console.log('1. Testing health endpoint');
    console.log('='.repeat(60));
    
    try {
        const health = await axios.get('http://localhost:3000/health', { timeout: 3000 });
        console.log('✅ Server running');
        console.log(`Database: ${health.data.database}`);
        console.log(`Mode: ${health.data.database === 'Connected' ? 'REAL DB' : 'MOCK MODE'}`);
    } catch (error) {
        console.log('❌ Server error:', error.message);
        return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('2. Testing registration with trace');
    console.log('='.repeat(60));
    
    // Create truly unique username
    const username = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const email = `debug_${Date.now()}@test.com`;
    
    const userData = {
        Name: 'Debug User',
        Email: email,
        Username: username,
        Password: 'Debug@123'
    };
    
    console.log('Trying to register:');
    console.log(`Username: ${username}`);
    console.log(`Email: ${email}`);
    console.log('(This should be completely unique)');
    
    try {
        const response = await axios.post('http://localhost:3000/api/auth/register', userData, {
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('\nResponse:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('\n✅ Registration successful!');
            // Now try login
            await testLogin(username, 'Debug@123');
        } else {
            console.log(`\n❌ Registration failed: ${response.data.message}`);
            
            // If it says "already exists", there's a bug
            if (response.data.message.includes('already exists')) {
                console.log('\n🔴 BUG DETECTED:');
                console.log('A completely new username/email says "already exists"');
                console.log('This means either:');
                console.log('1. Database is in MOCK MODE (returning canned responses)');
                console.log('2. There is a bug in the validation logic');
                console.log('3. Database trigger/constraint issue');
            }
        }
        
    } catch (error) {
        console.log('\n❌ Request error:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.log('No response received');
            console.log('Error:', error.message);
        } else {
            console.log('Setup error:', error.message);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('3. Testing existing endpoints without auth');
    console.log('='.repeat(60));
    
    // Test public endpoints
    const publicEndpoints = [
        { url: 'http://localhost:3000/', name: 'Root' },
        { url: 'http://localhost:3000/health', name: 'Health' },
        { url: 'http://localhost:3000/api/db/info', name: 'DB Info' },
        { url: 'http://localhost:3000/api/campaigns', name: 'Campaigns' }
    ];
    
    for (const endpoint of publicEndpoints) {
        try {
            const response = await axios.get(endpoint.url, { timeout: 3000 });
            console.log(`${endpoint.name}: ✅ ${response.status}`);
            if (endpoint.name === 'DB Info' && response.data.database) {
                console.log(`   User: ${response.data.database.username}`);
                console.log(`   Tables: ${response.data.database.table_count}`);
            }
        } catch (error) {
            console.log(`${endpoint.name}: ❌ ${error.response?.status || error.code}`);
        }
    }
}

async function testLogin(username, password) {
    console.log('\n' + '='.repeat(60));
    console.log('Testing login...');
    console.log('='.repeat(60));
    
    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            Username: username,
            Password: password
        }, { timeout: 5000 });
        
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('\n✅ Login successful!');
            console.log(`Token: ${response.data.data.token.substring(0, 50)}...`);
        }
        
    } catch (error) {
        console.log('Login error:', error.response?.data?.message || error.message);
    }
}

// Run debug
debug().catch(console.error);