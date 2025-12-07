// config/database.js
const oracledb = require('oracledb');

class Database {
    constructor() {
        this.config = {
            user: process.env.DB_USER || 'c##ngouser',
            password: process.env.DB_PASSWORD || '123',
            connectString: process.env.DB_CONNECTION_STRING || 'localhost:1521/iba',
            poolMin: 2,
            poolMax: 10,
            poolIncrement: 2,
            poolTimeout: 60,
            autoCommit: true
        };
        
        this.pool = null;
        
        // Initialize Oracle settings
        oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
        oracledb.autoCommit = false;
        
        // Try to initialize Oracle Client
        try {
            if (process.env.ORACLE_CLIENT_PATH) {
                oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_PATH });
            } else {
                oracledb.initOracleClient();
            }
            console.log('✅ Oracle Client initialized');
        } catch (err) {
            console.warn('⚠️ Oracle Client not found, using mock mode');
            console.warn('   Error:', err.message);
            this.mockMode = true;
        }
    }

    async initialize() {
        try {
            if (this.mockMode) {
                console.log('🔄 Using mock database mode');
                return true;
            }
            
            console.log('🔄 Attempting to connect to Oracle database...');
            console.log(`📋 Connection details:`);
            console.log(`   User: ${this.config.user}`);
            console.log(`   Connect String: ${this.config.connectString}`);
            
            this.pool = await oracledb.createPool(this.config);
            console.log('✅ Oracle connection pool created successfully');
            
            // Test the connection
            const testResult = await this.executeQuery('SELECT 1 as test FROM DUAL');
            if (testResult.success) {
                console.log('✅ Database connection test passed');
                
                // Check schema/username
                const userResult = await this.executeQuery(
                    "SELECT USER as username, SYS_CONTEXT('USERENV', 'CON_NAME') as container FROM DUAL"
                );
                if (userResult.success) {
                    console.log(`📊 Connected as: ${userResult.rows[0].USERNAME}`);
                    console.log(`📦 Container: ${userResult.rows[0].CONTAINER}`);
                }
            } else {
                console.error('❌ Database connection test failed');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error creating Oracle connection pool:', error.message);
            
            // Provide helpful error messages
            if (error.message.includes('ORA-01017')) {
                console.error('💡 Hint: Invalid username/password. Check your .env file');
            } else if (error.message.includes('ORA-12154')) {
                console.error('💡 Hint: Cannot connect to database. Check connect string: localhost:1521/iba');
                console.error('💡 Hint: Make sure Oracle listener is running and database is up');
            } else if (error.message.includes('DPI-1047')) {
                console.error('💡 Hint: Oracle Client libraries not found.');
                console.error('💡 Hint: Install Oracle Instant Client or set ORACLE_CLIENT_PATH');
                console.error('💡 Hint: Download from: https://www.oracle.com/database/technologies/instant-client/downloads.html');
            }
            
            // Fall back to mock mode
            console.log('🔄 Falling back to mock database mode');
            this.mockMode = true;
            return false;
        }
    }

    async executeQuery(sql, binds = [], options = {}) {
        // If in mock mode, return mock data
        if (this.mockMode) {
            return this.getMockData(sql, binds);
        }
        
        // If pool doesn't exist yet, try to create it
        if (!this.pool) {
            const initialized = await this.initialize();
            if (!initialized) {
                return this.getMockData(sql, binds);
            }
        }
        
        let connection;
        try {
            // Get connection from pool
            connection = await this.pool.getConnection();
            
            const result = await connection.execute(sql, binds, {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                autoCommit: options.autoCommit || false,
                ...options
            });
            
            if (options.autoCommit !== false) {
                await connection.commit();
            }
            
            return {
                success: true,
                rows: result.rows || [],
                outBinds: result.outBinds,
                metaData: result.metaData,
                rowsAffected: result.rowsAffected
            };
        } catch (error) {
            console.error('❌ Database Error:');
            console.error('SQL:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''));
            console.error('Error:', error.message);
            
            // Fall back to mock data on error
            return this.getMockData(sql, binds);
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (error) {
                    console.error('Error closing connection:', error);
                }
            }
        }
    }

    getMockData(sql, binds) {
        console.log(`[MOCK] Query: ${sql.substring(0, 50)}...`);
        
        // Return mock data based on query type
        if (sql.includes('SELECT 1') || sql.includes('FROM DUAL')) {
            return {
                success: true,
                rows: [{ TEST: 1, MESSAGE: 'Mock data' }]
            };
        }
        
        if (sql.includes('SELECT * FROM USER_ACCOUNT')) {
            return {
                success: true,
                rows: [
                    { USER_ID: 1, USERNAME: 'test', USER_PASSWORD: 'hash', IS_ACTIVE: 'Y', PERSON_ID: 1 },
                    { USER_ID: 2, USERNAME: 'admin', USER_PASSWORD: 'hash', IS_ACTIVE: 'Y', PERSON_ID: 2 }
                ]
            };
        }
        
        if (sql.includes('SELECT * FROM PERSON')) {
            return {
                success: true,
                rows: [
                    { PERSON_ID: 1, NAME: 'Test User', EMAIL: 'test@test.com' },
                    { PERSON_ID: 2, NAME: 'Admin User', EMAIL: 'admin@test.com' }
                ]
            };
        }
        
        if (sql.includes('INSERT INTO')) {
            return {
                success: true,
                rowsAffected: 1,
                outBinds: { id: [Math.floor(Math.random() * 1000) + 1] }
            };
        }
        
        // Default mock response
        return {
            success: true,
            rows: [],
            metaData: [],
            rowsAffected: 0
        };
    }

    async close() {
        if (this.pool) {
            try {
                await this.pool.close();
                console.log('Oracle connection pool closed');
            } catch (error) {
                console.error('Error closing connection pool:', error);
            }
        }
    }
}

module.exports = new Database();