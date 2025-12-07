// single-diagnostic.js
console.log('=== SINGLE DIAGNOSTIC ===\n');

// 1. First, let's see what Node.js actually sees
console.log('1. Reading raw file...');
const fs = require('fs');
const content = fs.readFileSync('./src/controllers/authController.js', 'utf8');
console.log('   File size:', content.length, 'chars');
console.log('   First char code:', content.charCodeAt(0));
console.log('   Has BOM (65279):', content.charCodeAt(0) === 65279);

// 2. Clear ALL cache related to this file
console.log('\n2. Clearing cache...');
Object.keys(require.cache).forEach(key => {
    if (key.includes('authController') || key.includes('controllers')) {
        delete require.cache[key];
    }
});

// 3. Try to load with error handling
console.log('\n3. Attempting to load...');
try {
    const auth = require('./src/controllers/authController');
    console.log('   ✅ Loaded without error');
    
    console.log('\n4. Analyzing loaded object:');
    console.log('   Type:', typeof auth);
    console.log('   Constructor:', auth.constructor.name);
    console.log('   Keys:', Object.keys(auth).length);
    
    // Direct prototype check
    const proto = Object.getPrototypeOf(auth);
    console.log('   Prototype constructor:', proto.constructor.name);
    
    // List ALL properties on the instance and prototype
    console.log('\n5. All enumerable properties:');
    for (let key in auth) {
        console.log(`   - ${key}: ${typeof auth[key]}`);
    }
    
    // Check specific methods
    console.log('\n6. Specific checks:');
    console.log('   auth.register:', auth.register);
    console.log('   typeof auth.register:', typeof auth.register);
    console.log('   "register" in auth:', 'register' in auth);
    
    // Try to get the property descriptor
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'register');
    console.log('   Property descriptor exists:', !!descriptor);
    if (descriptor) {
        console.log('   Descriptor:', {
            value: typeof descriptor.value,
            writable: descriptor.writable,
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable
        });
    }
    
} catch (error) {
    console.log('   ❌ Load error:', error.message);
    console.log('   Stack:', error.stack);
}

console.log('\n=== END DIAGNOSTIC ===');