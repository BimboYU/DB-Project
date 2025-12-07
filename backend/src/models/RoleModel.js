const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class RoleModel extends BaseModel {
    constructor() {
        super('Role');
        this.primaryKey = 'Role_ID';
    }

    async getAllRoles() {
        const sql = 'SELECT * FROM Role ORDER BY Role_Name';
        const result = await db.executeQuery(sql);
        return result.rows;
    }

    async assignRoleToUser(userId, roleId) {
        const sql = `
            INSERT INTO User_Role (User_ID, Role_ID, Assigned_Date)
            VALUES (:userId, :roleId, SYSDATE)
        `;
        await db.executeQuery(sql, [userId, roleId]);
    }

    async removeRoleFromUser(userId, roleId) {
        const sql = 'DELETE FROM User_Role WHERE User_ID = :userId AND Role_ID = :roleId';
        await db.executeQuery(sql, [userId, roleId]);
    }

    async getUserRoles(userId) {
        const sql = `
            SELECT r.Role_ID, r.Role_Name, r.Role_Description, ur.Assigned_Date
            FROM Role r
            JOIN User_Role ur ON r.Role_ID = ur.Role_ID
            WHERE ur.User_ID = :userId
            ORDER BY r.Role_Name
        `;
        const result = await db.executeQuery(sql, [userId]);
        return result.rows;
    }

    async getRoleByName(roleName) {
        const sql = 'SELECT * FROM Role WHERE Role_Name = :roleName';
        const result = await db.executeQuery(sql, [roleName]);
        return result.rows[0] || null;
    }
}

module.exports = new RoleModel();