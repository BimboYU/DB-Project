// test-all-models.js
console.log('🧪 TESTING ALL MODELS\n');

// List of models based on your controller imports
const models = [
    'UserModel',
    'PersonModel', 
    'DonorModel',
    'RoleModel',
    'DonationModel',
    'CampaignModel',
    'VolunteerModel',
    'InternModel',
    'JobsModel',
    'BeneficiaryModel',
    'ExpenseModel',
    'InKindDonationModel',
    'AuditModel'
];

console.log(`Testing ${models.length} models...\n`);

const results = [];

models.forEach(modelName => {
    console.log(`${'='.repeat(50)}`);
    console.log(`🔍 ${modelName}`);
    console.log(`${'='.repeat(50)}`);
    
    const result = { name: modelName, success: false, methods: [], error: null };
    
    try {
        // Clear cache
        delete require.cache[require.resolve(`./src/models/${modelName}`)];
        
        // Load model
        const model = require(`./src/models/${modelName}`);
        
        console.log(`✅ LOADED SUCCESSFULLY`);
        console.log(`   Type: ${typeof model}`);
        
        // Check if it's a class or object
        if (model && typeof model === 'object') {
            console.log(`   Constructor: ${model.constructor ? model.constructor.name : 'No constructor'}`);
            
            // Get all methods/properties
            const allProps = [];
            let obj = model;
            while (obj && obj !== Object.prototype) {
                allProps.push(...Object.getOwnPropertyNames(obj));
                obj = Object.getPrototypeOf(obj);
            }
            
            // Filter out standard properties and get methods
            const standardProps = ['constructor', '__defineGetter__', '__defineSetter__', 
                                  'hasOwnProperty', '__lookupGetter__', '__lookupSetter__', 
                                  'isPrototypeOf', 'propertyIsEnumerable', 'toString', 
                                  'valueOf', '__proto__', 'toLocaleString'];
            
            const customMethods = [...new Set(allProps)].filter(prop => 
                !standardProps.includes(prop) && typeof model[prop] === 'function'
            ).sort();
            
            console.log(`📋 METHODS: ${customMethods.length}`);
            
            if (customMethods.length > 0) {
                // Display in groups of 5 for readability
                for (let i = 0; i < customMethods.length; i += 5) {
                    const chunk = customMethods.slice(i, i + 5);
                    console.log(`   ${chunk.join(', ')}`);
                }
                
                // Check for database methods patterns
                const dbPatterns = ['find', 'create', 'update', 'delete', 'get', 'search', 'count'];
                const hasDbMethods = customMethods.some(method => 
                    dbPatterns.some(pattern => method.toLowerCase().includes(pattern))
                );
                
                console.log(`\n🔧 ANALYSIS:`);
                console.log(`   Has database methods: ${hasDbMethods ? '✅' : '⚠️'}`);
                console.log(`   Is likely a Model class: ${hasDbMethods ? '✅' : '❓'}`);
                
                result.methods = customMethods;
            } else {
                console.log(`⚠️  NO CUSTOM METHODS FOUND`);
                console.log(`   This might be an empty model or uses different pattern`);
            }
            
            result.success = true;
            
        } else if (typeof model === 'function') {
            console.log(`⚠️  Model is a function/class (not instantiated)`);
            console.log(`   You might need to instantiate it with "new"`);
            result.success = true;
            result.type = 'class';
            
        } else {
            console.log(`❓ Unknown type: ${typeof model}`);
            result.success = false;
            result.error = `Unknown type: ${typeof model}`;
        }
        
    } catch (error) {
        console.log(`❌ LOAD ERROR: ${error.message}`);
        
        // Check for common issues
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log(`   File not found: ./src/models/${modelName}.js`);
            console.log(`   Check if file exists or has different name`);
        } else if (error.message.includes('Cannot find module')) {
            console.log(`   Module dependency missing`);
        }
        
        result.error = error.message;
    }
    
    results.push(result);
    console.log('');
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 MODEL TEST SUMMARY');
console.log('='.repeat(60));

const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`\n✅ SUCCESSFULLY LOADED: ${successful.length}/${models.length}`);
if (successful.length > 0) {
    successful.forEach(r => {
        console.log(`   ${r.name}: ${r.methods ? r.methods.length + ' methods' : 'loaded'}`);
    });
}

if (failed.length > 0) {
    console.log(`\n❌ FAILED TO LOAD: ${failed.length}`);
    failed.forEach(r => {
        console.log(`   ${r.name}: ${r.error}`);
    });
}

// Database connection test
console.log('\n' + '='.repeat(60));
console.log('🔗 DATABASE CONNECTION TEST');
console.log('='.repeat(60));

try {
    const db = require('./src/config/database');
    console.log('\nTesting database configuration...');
    
    // Check if executeQuery exists
    if (typeof db.executeQuery === 'function') {
        console.log('✅ Database module loaded');
        console.log('   executeQuery method: Available');
        
        // Try a simple query (if you want to test actual connection)
        // Note: This might fail if database is not configured
        console.log('\n⚠️  Note: Database connection not tested');
        console.log('   To test actual connection, run:');
        console.log('   node test-db-connection.js');
        
    } else {
        console.log('⚠️  Database module loaded but executeQuery not found');
        console.log('   Check database configuration');
    }
    
} catch (error) {
    console.log(`\n❌ Database config error: ${error.message}`);
}

console.log('\n💡 RECOMMENDATIONS:');
console.log('1. Test database connection separately');
console.log('2. Test each model with actual database queries');
console.log('3. Create integration tests for controllers + models');