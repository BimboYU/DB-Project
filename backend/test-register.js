// test-auth-debug.js
const axios = require('axios');

console.log('🔍 Testing Authentication API...\n');

async function testRegistration() {
    console.log('1. Testing registration endpoint...');
    
    try {
        const response = await axios.post('http://localhost:3000/api/auth/register', {
            Name: 'Test User',
            Email: 'test@test.com',
            Username: 'testuser',
            Password: 'test123'
        }, {
            timeout: 5000,
            validateStatus: function (status) {
                return status < 500; // Resolve only if status code is less than 500
            }
        });
        
        console.log('   Status:', response.status);
        console.log('   Response:', JSON.stringify(response.data, null, 2));
        
        return response.data;
        
    } catch (error) {
        console.log('   ❌ Error:');
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.log('   No response received. Is server running?');
            console.log('   Error:', error.message);
        } else {
            console.log('   Setup error:', error.message);
        }
        return null;
    }
}

async function testLogin() {
    console.log('\n2. Testing login endpoint...');
    
    try {
        const response = await axios.post('http://localhost:3000/api/auth/login', {
            Username: 'testuser',
            Password: 'test123'
        });
        
        console.log('   ✅ Login successful');
        console.log('   Token received:', response.data.data.token ? 'Yes' : 'No');
        
        return response.data.data.token;
        
    } catch (error) {
        console.log('   ❌ Login failed:', error.response?.data?.message || error.message);
        return null;
    }
}

async function testProtectedEndpoint(token) {
    if (!token) {
        console.log('\n⚠️  Skipping protected endpoint test (no token)');
        return;
    }
    
    console.log('\n3. Testing protected endpoint (/api/persons)...');
    
    try {
        const response = await axios.get('http://localhost:3000/api/persons', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('   ✅ Protected endpoint accessible');
        console.log('   Found', response.data.data.length, 'persons');
        
    } catch (error) {
        console.log('   ❌ Protected endpoint failed:');
        console.log('   Status:', error.response?.status);
        console.log('   Error:', error.response?.data?.message || error.message);
    }
}

async function testHealth() {
    console.log('\n4. Testing health endpoint...');
    
    try {
        const response = await axios.get('http://localhost:3000/health');
        console.log('   ✅ Server is running');
        console.log('   Status:', response.data.status);
        console.log('   Database:', response.data.database);
        
    } catch (error) {
        console.log('   ❌ Health check failed:', error.message);
        console.log('   Make sure server is running: npm start');
    }
}

async function runAllTests() {
    console.log('='.repeat(60));
    console.log('🧪 COMPREHENSIVE AUTHENTICATION TEST');
    console.log('='.repeat(60));
    
    // First check if server is running
    await testHealth();
    
    // Test registration
    const registrationResult = await testRegistration();
    
    // Test login
    let token = null;
    if (registrationResult?.success) {
        token = await testLogin();
    } else {
        console.log('\n⚠️  Registration failed, trying login with existing user...');
        // Try with different username
        token = await testLogin();
        
        if (!token) {
            // Try with admin user
            console.log('\n🔧 Trying with admin credentials...');
            try {
                const adminResponse = await axios.post('http://localhost:3000/api/auth/login', {
                    Username: 'admin',
                    Password: 'admin123'
                });
                token = adminResponse.data.data.token;
                console.log('   ✅ Admin login successful');
            } catch (e) {
                console.log('   ❌ Admin login also failed');
            }
        }
    }
    
    // Test protected endpoint
    await testProtectedEndpoint(token);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST COMPLETE');
    console.log('='.repeat(60));
    
    if (token) {
        console.log('\n💡 Token acquired! You can use it to test other endpoints:');
        console.log('curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/persons');
    } else {
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('1. Make sure server is running: npm start');
        console.log('2. Check if user already exists (try different username)');
        console.log('3. Check database connection in server logs');
    }
}

// Add error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    console.error('Stack:', err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Run tests
runAllTests().catch(error => {
    console.error('Test suite failed:', error);
});