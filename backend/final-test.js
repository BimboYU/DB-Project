// test-with-existing-user.js
const axios = require('axios');

async function testWithExistingUser() {
    console.log('🔐 Testing with User That Has Roles\n');
    
    const credentials = {
        Username: 'final1765100133840',
        Password: 'test123'
    };
    
    console.log('Testing user:', credentials.Username);
    
    try {
        // 1. Login
        console.log('\n1. Logging in...');
        const login = await axios.post('http://localhost:3000/api/auth/login', credentials);
        
        console.log('Login:', login.data.success ? '✅ Success' : '❌ Failed');
        console.log('User roles:', login.data.data.roles || 'None');
        
        if (!login.data.success) {
            return;
        }
        
        const token = login.data.data.token;
        
        // 2. Test /api/persons
        console.log('\n2. Testing /api/persons...');
        const persons = await axios.get('http://localhost:3000/api/persons', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Access:', persons.status === 200 ? '✅ Granted' : '❌ Denied');
        console.log('Response:', JSON.stringify(persons.data, null, 2));
        
        // 3. Create a new person
        console.log('\n3. Testing person creation...');
        const newPerson = {
            NAME: 'API Created Person',
            EMAIL: 'api@created.com',
            AGE: 25,
            CONTACT_NO: '03001231234'
        };
        
        const createPerson = await axios.post('http://localhost:3000/api/persons', newPerson, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('Creation:', createPerson.data.success ? '✅ Success' : '❌ Failed');
        if (createPerson.data.success) {
            console.log('Created person ID:', createPerson.data.data?.PERSON_ID);
        }
        
    } catch (error) {
        console.log('\n❌ Error:', error.response?.data || error.message);
    }
}

testWithExistingUser();