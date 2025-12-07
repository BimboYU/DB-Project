// create-test.js
const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/controllers');

console.log('🔍 Checking controller exports...\n');

const controllers = [
    'authController.js',
    'personController.js',
    'donationController.js',
    'campaignController.js',
    'volunteerController.js',
    'internController.js',
    'jobsController.js',
    'beneficiaryController.js',
    'expenseController.js',
    'inKindController.js',
    'dashboardController.js',
    'reportController.js',
    'auditController.js',
    'roleController.js'
];

controllers.forEach(controllerFile => {
    const filePath = path.join(controllersDir, controllerFile);
    
    if (fs.existsSync(filePath)) {
        try {
            console.log(`📄 ${controllerFile}:`);
            
            // Read the file content
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check the last few lines
            const lines = content.split('\n');
            const lastLines = lines.slice(-5).join('\n');
            
            console.log('Last lines of file:');
            console.log(lastLines);
            console.log('');
            
            // Check if it exports new ClassName() or just ClassName
            if (lastLines.includes('module.exports = new')) {
                console.log('✅ Exports instance (correct)');
            } else if (lastLines.includes('module.exports =') && lastLines.includes('Controller')) {
                console.log('⚠️  Might be exporting class directly');
            } else {
                console.log('❓ Unknown export pattern');
            }
            
        } catch (error) {
            console.log(`❌ Error reading: ${error.message}`);
        }
    } else {
        console.log(`❌ ${controllerFile}: File not found`);
    }
    console.log('---\n');
});