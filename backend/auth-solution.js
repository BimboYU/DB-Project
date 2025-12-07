// working-auth-solution.js
const axios = require('axios');

console.log('🔑 WORKING AUTHENTICATION SOLUTION\n');

async function getUniqueUsername() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `user${timestamp}${random}`;
}

async function solution() {
    console.log('='.repeat(60));
    console.log('STEP 1: Check server health');
    console.log('='.repeat(60));
    
    try {
        const health = await axios.get('http://localhost:3000/health');
        console.log('✅ Server running');
        console.log(`Database: ${health.data.database}`);
    } catch {
        console.log('❌ Server not running. Start with: npm start');
        return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: Register NEW user (with unique credentials)');
    console.log('='.repeat(60));
    
    let registered = false;
    let newUser = null;
    let token = null;
    
    // Try up to 3 times with different usernames
    for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`\nAttempt ${attempt}:`);
        
        const username = await getUniqueUsername();
        newUser = {
            Name: `Test User ${attempt}`,
            Email: `test${username}@example.com`,
            Username: username,
            Password: 'Test@123'
        };
        
        console.log(`   Username: ${newUser.Username}`);
        console.log(`   Email: ${newUser.Email}`);
        
        try {
            const register = await axios.post('http://localhost:3000/api/auth/register', newUser, {
                timeout: 5000
            });
            
            if (register.data.success) {
                console.log('   ✅ Registration successful!');
                registered = true;
                break;
            } else {
                console.log(`   ❌ Registration failed: ${register.data.message}`);
            }
        } catch (error) {
            if (error.response?.data?.message?.includes('already exists')) {
                console.log('   ⚠️ User already exists, trying different username...');
            } else {
                console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
            }
        }
    }
    
    if (!registered) {
        console.log('\n❌ Could not register new user after 3 attempts');
        console.log('\n🔧 Trying to login with existing test users...');
        
        // Try common existing users
        const testUsers = [
            { username: 'testuser', password: 'test123' },
            { username: 'admin', password: 'admin123' },
            { username: 'user', password: 'password' }
        ];
        
        for (const user of testUsers) {
            try {
                console.log(`\nTrying: ${user.username}`);
                const login = await axios.post('http://localhost:3000/api/auth/login', user, {
                    timeout: 5000
                });
                
                if (login.data.success) {
                    token = login.data.data.token;
                    console.log(`✅ Login successful with ${user.username}!`);
                    newUser = { Username: user.username, Password: user.password };
                    registered = true;
                    break;
                }
            } catch {
                // Continue to next user
            }
        }
        
        if (!registered) {
            console.log('\n❌ No existing users found or wrong passwords');
            console.log('\n🔧 Next steps:');
            console.log('1. Check database for existing users');
            console.log('2. Reset password for existing user');
            console.log('3. Clear the users table and try again');
            return;
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: Login with user');
    console.log('='.repeat(60));
    
    // If we registered new user, now login
    if (registered && !token) {
        try {
            const login = await axios.post('http://localhost:3000/api/auth/login', {
                Username: newUser.Username,
                Password: newUser.Password
            }, { timeout: 5000 });
            
            if (login.data.success) {
                token = login.data.data.token;
                console.log('✅ Login successful!');
            } else {
                console.log('❌ Login failed:', login.data.message);
                return;
            }
        } catch (error) {
            console.log('❌ Login error:', error.response?.data?.message || error.message);
            return;
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('STEP 4: Test API with token');
    console.log('='.repeat(60));
    
    console.log(`Token: ${token.substring(0, 50)}...\n`);
    
    // Test various endpoints
    const endpoints = [
        { method: 'GET', path: '/api/auth/profile', name: 'User Profile' },
        { method: 'GET', path: '/api/persons', name: 'List Persons' },
        { method: 'GET', path: '/api/campaigns', name: 'List Campaigns' },
        { method: 'GET', path: '/api/donations', name: 'List Donations' }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.name}...`);
            
            const response = await axios({
                method: endpoint.method,
                url: `http://localhost:3000${endpoint.path}`,
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 5000
            });
            
            if (response.data.success) {
                const data = response.data.data;
                if (Array.isArray(data)) {
                    console.log(`   ✅ ${data.length} items found`);
                } else if (data && typeof data === 'object') {
                    console.log(`   ✅ Success - data received`);
                } else {
                    console.log(`   ✅ Success`);
                }
            } else {
                console.log(`   ⚠️ API returned error: ${response.data.message}`);
            }
        } catch (error) {
            if (error.response?.status === 401) {
                console.log(`   ❌ Access denied (401)`);
            } else if (error.response?.status === 403) {
                console.log(`   ❌ Forbidden (403)`);
            } else if (error.response?.status === 404) {
                console.log(`   ❌ Not found (404)`);
            } else {
                console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
            }
        }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 AUTHENTICATION TEST COMPLETE!');
    console.log('='.repeat(60));
    
    if (token) {
        console.log('\n💡 YOUR WORKING CREDENTIALS:');
        console.log(`Username: ${newUser.Username}`);
        console.log(`Password: ${newUser.Password}`);
        console.log(`Token: ${token.substring(0, 80)}...`);
        
        console.log('\n📋 EXAMPLE CURL COMMANDS:');
        console.log(`# Test profile`);
        console.log(`curl -H "Authorization: Bearer ${token.substring(0, 50)}..." http://localhost:3000/api/auth/profile`);
        
        console.log(`\n# Test persons`);
        console.log(`curl -H "Authorization: Bearer ${token.substring(0, 50)}..." http://localhost:3000/api/persons`);
    }
}

// Add error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

solution().catch(error => {
    console.error('Solution failed:', error.message);
});