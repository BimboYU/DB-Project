// diagnose-modules.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Existing Modules\n');

// Check models directory
const modelsDir = path.join(__dirname, 'src/models');
const controllersDir = path.join(__dirname, 'src/controllers');

console.log('📁 Models Directory:');
if (fs.existsSync(modelsDir)) {
    const modelFiles = fs.readdirSync(modelsDir);
    modelFiles.forEach(file => {
        console.log(`  📄 ${file}`);
    });
} else {
    console.log('  ❌ models directory not found');
}

console.log('\n📁 Controllers Directory:');
if (fs.existsSync(controllersDir)) {
    const controllerFiles = fs.readdirSync(controllersDir);
    controllerFiles.forEach(file => {
        console.log(`  📄 ${file}`);
    });
} else {
    console.log('  ❌ controllers directory not found');
}

// Check routes file
console.log('\n🔗 Checking routes file...');
const routesFile = path.join(__dirname, 'src/routes', 'index.js');
if (fs.existsSync(routesFile)) {
    const content = fs.readFileSync(routesFile, 'utf8');
    
    // Extract all routes
    const routes = content.match(/router\.[a-z]+\(['"`]([^'"`]+)/g) || [];
    
    console.log('Available API endpoints:');
    routes.forEach(route => {
        const match = route.match(/router\.[a-z]+\(['"`]([^'"`]+)/);
        if (match) {
            console.log(`  ${route.split('(')[0].replace('router.', '')} ${match[1]}`);
        }
    });
} else {
    console.log('  ❌ routes file not found');
}

// Check for specific controllers
console.log('\n🔍 Checking for specific controllers:');
const controllers = [
    'campaignController.js',
    'donationController.js', 
    'volunteerController.js',
    'expenseController.js',
    'beneficiaryController.js'
];

controllers.forEach(controller => {
    const controllerPath = path.join(controllersDir, controller);
    if (fs.existsSync(controllerPath)) {
        console.log(`  ✅ ${controller} - EXISTS`);
        
        // Check if it has basic methods
        const content = fs.readFileSync(controllerPath, 'utf8');
        const methods = ['getAll', 'create', 'getById', 'update'];
        const hasMethods = methods.filter(method => content.includes(`${method}`));
        
        if (hasMethods.length > 0) {
            console.log(`     Methods: ${hasMethods.join(', ')}`);
        }
    } else {
        console.log(`  ❌ ${controller} - NOT FOUND`);
    }
});