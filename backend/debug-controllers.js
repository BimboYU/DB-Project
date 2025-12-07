// debug-controllers.js
const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/controllers');

const problematicControllers = ['authController.js', 'personController.js', 'donationController.js'];

console.log('🔍 Debugging problematic controllers...\n');

problematicControllers.forEach(controllerFile => {
    const filePath = path.join(controllersDir, controllerFile);
    
    console.log(`📄 ${controllerFile}:`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    console.log(`File path: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
        try {
            // Get file stats
            const stats = fs.statSync(filePath);
            console.log(`File size: ${stats.size} bytes`);
            
            if (stats.size === 0) {
                console.log('❌ File is EMPTY (0 bytes)!');
            } else {
                // Read and display more content
                const content = fs.readFileSync(filePath, 'utf8');
                console.log(`\nFirst 100 characters:`);
                console.log(content.substring(0, 100) + '...');
                
                console.log(`\nLast 100 characters:`);
                console.log('...' + content.substring(content.length - 100));
                
                console.log(`\nTotal lines: ${content.split('\n').length}`);
                
                // Check for export line
                const lines = content.split('\n');
                console.log(`\nLooking for export statement...`);
                
                let foundExport = false;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('module.exports')) {
                        console.log(`Found at line ${i + 1}: ${lines[i]}`);
                        foundExport = true;
                    }
                }
                
                if (!foundExport) {
                    console.log('❌ No export statement found!');
                }
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
    console.log('\n' + '='.repeat(50) + '\n');
});

// Also test loading them
console.log('\n🔄 Testing controller loading...\n');

try {
    console.log('Attempting to load authController...');
    const authController = require('./src/controllers/authController');
    console.log('✅ Loaded successfully');
    console.log(`Type: ${typeof authController}`);
    console.log(`Is object: ${typeof authController === 'object'}`);
    console.log(`Methods found: ${Object.getOwnPropertyNames(Object.getPrototypeOf(authController)).filter(m => m !== 'constructor').join(', ')}`);
} catch (error) {
    console.log(`❌ Failed to load: ${error.message}`);
}