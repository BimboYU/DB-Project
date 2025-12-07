    // app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const db = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// Database Connection Test
// ========================
async function testDatabaseConnection() {
    console.log('🔗 Testing database connection...');
    try {
        const result = await db.executeQuery('SELECT 1 as test FROM DUAL');
        if (result.success) {
            console.log('Database connection successful');
            
            // Get user info
            const userInfo = await db.executeQuery(`
                SELECT USER as username, 
                       SYS_CONTEXT('USERENV', 'DB_NAME') as database_name
                FROM DUAL
            `);
            
            if (userInfo.success) {
                console.log(`Connected as: ${userInfo.rows[0].USERNAME}`);
                console.log(`Database: ${userInfo.rows[0].DATABASE_NAME}`);
            }
            
            return true;
        } else {
            console.error('Database connection failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Database test error:', error.message);
        return false;
    }
}

// ========================
// Middleware Setup
// ========================
app.use(helmet()); // Security headers
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
}));
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ========================
// Import Routes
// ========================
const routes = require('./src/routes');
app.use('/api', routes);

// ========================
// Health Check Endpoint
// ========================
app.get('/health', async (req, res) => {
    const dbTest = await db.executeQuery('SELECT 1 as status FROM DUAL');
    
    res.json({
        status: 'OK',
        service: 'NGO ERP Portal API',
        timestamp: new Date().toISOString(),
        database: dbTest.success ? 'Connected' : 'Error',
        version: '1.0.0'
    });
});

// ========================
// Database Info Endpoint
// ========================
app.get('/api/db/info', async (req, res) => {
    try {
        const result = await db.executeQuery(`
            SELECT 
                USER as username,
                SYS_CONTEXT('USERENV', 'DB_NAME') as database_name,
                SYS_CONTEXT('USERENV', 'INSTANCE_NAME') as instance_name,
                (SELECT COUNT(*) FROM user_tables) as table_count,
                (SELECT COUNT(*) FROM user_sequences) as sequence_count
            FROM DUAL
        `);
        
        if (result.success) {
            res.json({
                success: true,
                database: result.rows[0]
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========================
// Welcome Route
// ========================
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to NGO ERP Portal API',
        documentation: '/api',
        health: '/health',
        database: '/api/db/info'
    });
});

// ========================
// Error Handlers
// ========================
// 404 - Route not found
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ========================
// Start Server
// ========================
async function startServer() {
    console.log('\nStarting NGO ERP Portal Backend...');
    console.log('========================================\n');
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.error('\nFATAL: Database connection failed. Server cannot start.');
        console.error('Check:');
        console.error('   1. Oracle database is running');
        console.error('   2. .env file has correct credentials');
        console.error('   3. Oracle listener is active');
        process.exit(1);
    }
    
    // Start listening
    app.listen(PORT, () => {
        console.log('\nSERVER STARTED SUCCESSFULLY');
        console.log('========================================');
        console.log(`Port: ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`URL: http://localhost:${PORT}`);
        console.log(`Health: http://localhost:${PORT}/health`);
        console.log(`API Docs: http://localhost:${PORT}/api`);
        console.log('\nServer is running. Press Ctrl+C to stop.');
        console.log('========================================\n');
    });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('\nSIGTERM received. Shutting down gracefully...');
    await db.close();
    console.log('Server shut down gracefully');
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('\nSIGINT received. Shutting down gracefully...');
    await db.close();
    console.log('Server shut down gracefully');
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
});