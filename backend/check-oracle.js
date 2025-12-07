// config/database.js
const oracledb = require('oracledb');

class Database {
    constructor() {
        this.initializeOracleClient();
    }

    initializeOracleClient() {
        try {
            // Try common Oracle client locations
            const locations = [
                'C:\\instantclient_21_12',
                'C:\\Oracle\\xe\\bin',
                process.env.ORACLE_HOME,
                process.env.ORACLE_CLIENT_PATH
            ].filter(Boolean);
            
            for (const location of locations) {
                try {
                    oracledb.initOracleClient({ libDir: location });
                    console.log(`✅ Oracle Client found at: ${location}`);
                    return;
                } catch (e) {
                    // Try next location
                }
            }
            
            // Try without specifying location (might be in PATH)
            oracledb.initOracleClient();
            console.log('✅ Oracle Client found in PATH');
        } catch (err) {
            console.warn('⚠️ WARNING: Oracle Client not found.');
            console.warn('   For development, you can continue but database operations will fail.');
            console.warn('   To fix: Install Oracle Instant Client from:');
            console.warn('   https://www.oracle.com/database/technologies/instant-client/downloads.html');
        }
    }

    async testConnection() {
        try {
            const result = await this.executeQuery('SELECT 1 as test FROM DUAL');
            return result.success;
        } catch (error) {
            return false;
        }
    }

    async executeQuery(sql, binds = []) {
        // This is a mock for now - we'll implement real version later
        console.log(`[DEBUG] SQL: ${sql.substring(0, 100)}...`);
        console.log(`[DEBUG] Binds:`, binds);
        
        // Return mock data for development
        if (sql.includes('SELECT 1')) {
            return { success: true, rows: [{ TEST: 1 }] };
        }
        
        return { success: false, error: 'Oracle Client not installed' };
    }
}

module.exports = new Database();