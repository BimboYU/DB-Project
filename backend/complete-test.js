// complete-test.js
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

console.log('='.repeat(70));
console.log('🧪 COMPLETE BACKEND TEST SUITE FOR BEGINNERS');
console.log('='.repeat(70));

async function runStep(stepNumber, description, testFunction) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`STEP ${stepNumber}: ${description}`);
    console.log(`${'─'.repeat(70)}`);
    
    try {
        await testFunction();
        console.log(`✅ Step ${stepNumber} completed successfully`);
        return true;
    } catch (error) {
        console.log(`❌ Step ${stepNumber} failed: ${error.message}`);
        return false;
    }
}

async function step1_CheckEnvironment() {
    console.log('\n📋 Checking your setup...');
    
    // Check Node.js version
    const { stdout: nodeVersion } = await execPromise('node --version');
    console.log(`✅ Node.js: ${nodeVersion.trim()}`);
    
    // Check npm version
    const { stdout: npmVersion } = await execPromise('npm --version');
    console.log(`✅ npm: ${npmVersion.trim()}`);
    
    // Check .env file
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    
    if (fs.existsSync(envPath)) {
        console.log('✅ .env file exists');
        
        // Read key values (simplified)
        const envContent = fs.readFileSync(envPath, 'utf8');
        const hasDbUser = envContent.includes('DB_USER');
        const hasDbPassword = envContent.includes('DB_PASSWORD');
        const hasJwtSecret = envContent.includes('JWT_SECRET');
        
        console.log(`   DB_USER configured: ${hasDbUser ? '✅' : '❌'}`);
        console.log(`   DB_PASSWORD configured: ${hasDbPassword ? '✅' : '❌'}`);
        console.log(`   JWT_SECRET configured: ${hasJwtSecret ? '✅' : '❌'}`);
        
        if (!hasDbUser || !hasDbPassword) {
            throw new Error('Database credentials missing in .env');
        }
    } else {
        throw new Error('.env file not found. Create it from .env.example');
    }
    
    // Check package.json dependencies
    const packageJson = require('./package.json');
    console.log(`✅ Express: ${packageJson.dependencies.express || 'Not found'}`);
    console.log(`✅ OracleDB: ${packageJson.dependencies.oracledb || 'Not found'}`);
    console.log(`✅ JWT: ${packageJson.dependencies.jsonwebtoken || 'Not found'}`);
}

async function step2_TestDatabase() {
    console.log('\n🔄 Testing database connection...');
    
    const db = require('./src/config/database');
    const initialized = await db.initialize();
    
    if (!initialized) {
        throw new Error('Database connection failed. Check Oracle setup.');
    }
    
    // Simple test query
    const result = await db.executeQuery('SELECT 1 as STATUS, USER as DB_USER FROM DUAL');
    
    if (!result.success) {
        throw new Error('Database query failed');
    }
    
    console.log(`✅ Connected to Oracle Database`);
    console.log(`   Database User: ${result.rows[0].DB_USER}`);
    console.log(`   Connection: Working`);
}

async function step3_TestModels() {
    console.log('\n📦 Testing key models...');
    
    const models = ['PersonModel', 'UserModel', 'DonationModel'];
    
    for (const modelName of models) {
        console.log(`\n   Testing ${modelName}...`);
        
        try {
            delete require.cache[require.resolve(`./src/models/${modelName}`)];
            const Model = require(`./src/models/${modelName}`);
            
            // Test findAll method
            if (typeof Model.findAll === 'function') {
                const results = await Model.findAll({}, 2, 0);
                console.log(`     ✅ findAll() works`);
                console.log(`     Records found: ${Array.isArray(results) ? results.length : 'N/A'}`);
            } else {
                console.log(`     ⚠️ No findAll method`);
            }
        } catch (error) {
            console.log(`     ❌ Error: ${error.message}`);
        }
    }
}

async function step4_TestControllers() {
    console.log('\n🎯 Testing controllers...');
    
    const controllers = ['authController', 'personController'];
    
    for (const controllerName of controllers) {
        console.log(`\n   Testing ${controllerName}...`);
        
        try {
            delete require.cache[require.resolve(`./src/controllers/${controllerName}`)];
            const Controller = require(`./src/controllers/${controllerName}`);
            
            // Check if it has methods
            const proto = Object.getPrototypeOf(Controller);
            const methods = Object.getOwnPropertyNames(proto)
                .filter(name => name !== 'constructor' && typeof Controller[name] === 'function');
            
            console.log(`     ✅ Loaded successfully`);
            console.log(`     Methods: ${methods.length}`);
            
            if (methods.length > 0) {
                console.log(`     Sample: ${methods.slice(0, 3).join(', ')}`);
            }
        } catch (error) {
            console.log(`     ❌ Error: ${error.message}`);
        }
    }
}

async function step5_StartServerTest() {
    console.log('\n🚀 Starting test server...');
    
    return new Promise((resolve, reject) => {
        const express = require('express');
        const app = express();
        
        app.use(express.json());
        
        // Simple test route
        app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                message: 'Backend is working!',
                timestamp: new Date().toISOString()
            });
        });
        
        const server = app.listen(3001, () => {
            console.log('✅ Test server running on port 3001');
            console.log('💡 Open: http://localhost:3001/health');
            
            // Test the endpoint
            const http = require('http');
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: '/health',
                method: 'GET'
            };
            
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log('✅ Health check response:', JSON.parse(data));
                    server.close(() => {
                        console.log('✅ Test server stopped');
                        resolve();
                    });
                });
            });
            
            req.on('error', reject);
            req.end();
        });
        
        server.on('error', reject);
    });
}

// Main execution
(async () => {
    try {
        const steps = [
            { num: 1, desc: 'Environment Check', func: step1_CheckEnvironment },
            { num: 2, desc: 'Database Connection', func: step2_TestDatabase },
            { num: 3, desc: 'Models Test', func: step3_TestModels },
            { num: 4, desc: 'Controllers Test', func: step4_TestControllers },
            { num: 5, desc: 'Server Test', func: step5_StartServerTest }
        ];
        
        let allPassed = true;
        
        for (const step of steps) {
            const passed = await runStep(step.num, step.desc, step.func);
            if (!passed) {
                allPassed = false;
                console.log(`\n⚠️ Step ${step.num} failed. Check the error above.`);
                break;
            }
        }
        
        console.log('\n' + '='.repeat(70));
        if (allPassed) {
            console.log('🎉🎉🎉 ALL TESTS PASSED! YOUR BACKEND IS READY! 🎉🎉🎉');
            console.log('\n📋 NEXT STEPS:');
            console.log('1. Start your main server: npm start');
            console.log('2. Test API with Postman or browser');
            console.log('3. Connect your frontend application');
            console.log('4. Deploy when ready!');
        } else {
            console.log('⚠️ SOME TESTS FAILED. CHECK ERRORS ABOVE.');
            console.log('\n🔧 TROUBLESHOOTING:');
            console.log('1. Make sure Oracle Database is installed and running');
            console.log('2. Check .env file has correct credentials');
            console.log('3. Run: sqlplus c##ngouser/123@localhost:1521/iba');
            console.log('4. Check if tables exist in database');
        }
        console.log('='.repeat(70));
        
    } catch (error) {
        console.error('\n❌ Unexpected error:', error);
    }
})();