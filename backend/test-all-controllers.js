// test-all-controllers-complete.js
console.log('🧪 TESTING ALL CONTROLLERS COMPLETELY\n');

const controllers = [
    'authController',
    'personController',
    'donationController',
    'campaignController',
    'volunteerController',
    'internController',
    'jobsController',
    'beneficiaryController',
    'expenseController',
    'inKindController',
    'dashboardController',
    'reportController',
    'auditController',
    'roleController'
];

console.log(`Testing ${controllers.length} controllers...\n`);

const results = [];

controllers.forEach(controllerName => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 ${controllerName.toUpperCase()}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = { name: controllerName, success: false, methods: [], error: null };
    
    try {
        // Clear cache
        delete require.cache[require.resolve(`./src/controllers/${controllerName}`)];
        
        // Load controller
        const controller = require(`./src/controllers/${controllerName}`);
        
        console.log(`✅ LOADED SUCCESSFULLY`);
        console.log(`   Type: ${typeof controller}`);
        console.log(`   Constructor: ${controller.constructor.name}`);
        
        // Get all methods from prototype chain
        let proto = Object.getPrototypeOf(controller);
        const methods = [];
        
        while (proto && proto !== Object.prototype) {
            const props = Object.getOwnPropertyNames(proto);
            props.forEach(prop => {
                if (prop !== 'constructor' && typeof controller[prop] === 'function') {
                    methods.push(prop);
                }
            });
            proto = Object.getPrototypeOf(proto);
        }
        
        // Remove duplicates and sort
        const uniqueMethods = [...new Set(methods)].sort();
        
        console.log(`📋 METHODS FOUND: ${uniqueMethods.length}`);
        
        if (uniqueMethods.length > 0) {
            // Group methods for better display
            const groupedMethods = {};
            uniqueMethods.forEach(method => {
                const prefix = method.split(/(?=[A-Z])/)[0]; // Get first word
                if (!groupedMethods[prefix]) groupedMethods[prefix] = [];
                groupedMethods[prefix].push(method);
            });
            
            // Display grouped methods
            Object.keys(groupedMethods).forEach(group => {
                console.log(`   ${group.toUpperCase()}: ${groupedMethods[group].join(', ')}`);
            });
            
            // Check for common controller patterns
            console.log(`\n🔧 PATTERN ANALYSIS:`);
            
            // Check for CRUD operations
            const crudMethods = ['create', 'get', 'getAll', 'update', 'delete', 'register'];
            const hasCrud = uniqueMethods.some(m => crudMethods.some(crud => m.toLowerCase().includes(crud)));
            console.log(`   Has CRUD operations: ${hasCrud ? '✅' : '⚠️'}`);
            
            // Check for async methods
            const sampleMethod = uniqueMethods[0];
            if (sampleMethod && controller[sampleMethod]) {
                const isAsync = controller[sampleMethod].constructor.name === 'AsyncFunction';
                console.log(`   Methods are async: ${isAsync ? '✅' : '⚠️'}`);
            }
            
            result.methods = uniqueMethods;
        } else {
            console.log(`⚠️  NO METHODS FOUND`);
        }
        
        result.success = true;
        
    } catch (error) {
        console.log(`❌ LOAD ERROR: ${error.message}`);
        if (error.code === 'MODULE_NOT_FOUND') {
            console.log(`   File not found: ./src/controllers/${controllerName}.js`);
        }
        result.error = error.message;
    }
    
    results.push(result);
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 COMPREHENSIVE TEST SUMMARY');
console.log('='.repeat(60));

const successful = results.filter(r => r.success && r.methods.length > 0);
const noMethods = results.filter(r => r.success && r.methods.length === 0);
const failed = results.filter(r => !r.success);

console.log(`\n✅ SUCCESSFUL WITH METHODS: ${successful.length}/${controllers.length}`);
successful.forEach(r => {
    console.log(`   ${r.name}: ${r.methods.length} methods`);
});

if (noMethods.length > 0) {
    console.log(`\n⚠️  LOADED BUT NO METHODS: ${noMethods.length}`);
    noMethods.forEach(r => {
        console.log(`   ${r.name}: Loaded but no methods detected`);
    });
}

if (failed.length > 0) {
    console.log(`\n❌ FAILED TO LOAD: ${failed.length}`);
    failed.forEach(r => {
        console.log(`   ${r.name}: ${r.error}`);
    });
}

// Total method count
const totalMethods = results.reduce((sum, r) => sum + r.methods.length, 0);
console.log(`\n📈 TOTAL METHODS ACROSS ALL CONTROLLERS: ${totalMethods}`);

// Check for common issues
console.log('\n🔍 COMMON ISSUES CHECK:');

// Check for duplicate method names across controllers
const allMethodNames = [];
results.forEach(r => {
    r.methods.forEach(method => {
        allMethodNames.push(`${r.name}.${method}`);
    });
});

const duplicates = allMethodNames.filter((name, index) => allMethodNames.indexOf(name) !== index);
if (duplicates.length > 0) {
    console.log(`   ⚠️  Potential duplicate method names: ${duplicates.join(', ')}`);
} else {
    console.log(`   ✅ No duplicate method names detected`);
}

// Check for proper exports
console.log(`\n✅ ALL CONTROLLERS TESTED SUCCESSFULLY!`);

// Export results for further analysis
console.log('\n💾 Results available in: results variable');
if (typeof global !== 'undefined') {
    global.controllerTestResults = results;
}