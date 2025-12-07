// models/UserModel.js
const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class UserModel extends BaseModel {
    constructor() {
        super('USER_ACCOUNT');
        this.primaryKey = 'USER_ID';
    }

    async createUser(userData) {
        const sql = `
            INSERT INTO USER_ACCOUNT (
                USER_ID, PERSON_ID, USERNAME, USER_PASSWORD, IS_ACTIVE, CREATED_DATE
            ) VALUES (
                SEQ_USER_ID.NEXTVAL, :PERSON_ID, :USERNAME, :USER_PASSWORD, 'Y', SYSDATE
            ) RETURNING USER_ID INTO :id
        `;
        
        const binds = {
            PERSON_ID: userData.PERSON_ID,
            USERNAME: userData.USERNAME,
            USER_PASSWORD: userData.USER_PASSWORD,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await db.executeQuery(sql, binds, { autoCommit: true });
        return result.outBinds.id[0];
    }

    async findByUsername(username) {
        const sql = `
            SELECT 
                USER_ID as USER_ID,
                PERSON_ID as PERSON_ID,
                USERNAME as USERNAME,
                USER_PASSWORD as USER_PASSWORD,
                IS_ACTIVE as IS_ACTIVE,
                CREATED_DATE as CREATED_DATE,
                LAST_LOGIN as LAST_LOGIN
            FROM USER_ACCOUNT 
            WHERE USERNAME = :username
        `;
        const result = await db.executeQuery(sql, [username]);
        
        if (!result.rows || result.rows.length === 0) {
            return null;
        }
        
        const row = result.rows[0];
        
        // Debug log
        console.log('🔍 UserModel.findByUsername result:');
        console.log('  Raw row keys:', Object.keys(row));
        console.log('  USER_ID:', row.USER_ID);
        console.log('  USERNAME:', row.USERNAME);
        console.log('  Has USER_PASSWORD:', 'USER_PASSWORD' in row);
        
        return row;
    }

    async findById(userId) {
        // FIX: Use explicit column names
        const sql = `
            SELECT 
                USER_ID as USER_ID,
                PERSON_ID as PERSON_ID,
                USERNAME as USERNAME,
                USER_PASSWORD as USER_PASSWORD,
                IS_ACTIVE as IS_ACTIVE,
                CREATED_DATE as CREATED_DATE,
                LAST_LOGIN as LAST_LOGIN
            FROM USER_ACCOUNT 
            WHERE USER_ID = :userId
        `;
        const result = await db.executeQuery(sql, [userId]);
        return result.rows[0] || null;
    }

    // ... rest of the methods remain the same
    async findByEmail(email) {
        const sql = `
            SELECT ua.* 
            FROM USER_ACCOUNT ua
            JOIN PERSON p ON ua.PERSON_ID = p.PERSON_ID
            WHERE p.EMAIL = :email
        `;
        const result = await db.executeQuery(sql, [email]);
        return result.rows[0] || null;
    }

    async updateLastLogin(userId) {
        const sql = 'UPDATE USER_ACCOUNT SET LAST_LOGIN = SYSDATE WHERE USER_ID = :userId';
        await db.executeQuery(sql, [userId]);
    }

    async updatePassword(userId, newPassword) {
        const sql = 'UPDATE USER_ACCOUNT SET USER_PASSWORD = :password WHERE USER_ID = :userId';
        await db.executeQuery(sql, [newPassword, userId]);
    }

    async deactivateUser(userId) {
        const sql = "UPDATE USER_ACCOUNT SET IS_ACTIVE = 'N' WHERE USER_ID = :userId";
        await db.executeQuery(sql, [userId]);
    }

    async getUserRoles(userId) {
        const sql = `
            SELECT r.ROLE_ID, r.ROLE_NAME, r.ROLE_DESCRIPTION
            FROM USER_ROLE ur
            JOIN ROLE r ON ur.ROLE_ID = r.ROLE_ID
            WHERE ur.USER_ID = :userId
        `;
        const result = await db.executeQuery(sql, [userId]);
        return result.rows;
    }
}

module.exports = new UserModel();