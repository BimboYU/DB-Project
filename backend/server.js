// Add after other middleware
app.use(express.static('public')); // For serving static files

// Add before 404 handler
app.use('/api/uploads', express.static('uploads')); // For file uploads

// Create required directories
const fs = require('fs');
const dirs = ['uploads', 'reports', 'logs'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});