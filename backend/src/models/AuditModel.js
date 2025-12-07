const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class AuditModel extends BaseModel {
    constructor() {
        super('AUDIT_LOG');
        this.primaryKey = 'Audit_ID';
    }

    async logAction(userId, tableName, operation, recordId, oldValues, newValues, ipAddress) {
        const sql = `
            INSERT INTO Audit_Log (
                Audit_ID, User_ID, Table_Name, Operation, Record_ID,
                Old_Values, New_Values, Timestamp, IP_Address
            ) VALUES (
                seq_audit_id.NEXTVAL, :User_ID, :Table_Name, :Operation, :Record_ID,
                :Old_Values, :New_Values, SYSDATE, :IP_Address
            )
        `;
        
        const oldValStr = oldValues ? JSON.stringify(oldValues) : null;
        const newValStr = newValues ? JSON.stringify(newValues) : null;
        
        await db.executeQuery(sql, [
            userId,
            tableName,
            operation,
            recordId,
            oldValStr,
            newValStr,
            ipAddress
        ]);
    }

    async getAuditLogs(filters = {}, page = 1, limit = 50) {
        let sql = `
            SELECT a.*, u.Username, p.Name AS User_Name
            FROM Audit_Log a
            LEFT JOIN User_Account u ON a.User_ID = u.User_ID
            LEFT JOIN Person p ON u.Person_ID = p.Person_ID
            WHERE 1=1
        `;
        
        const binds = [];
        let bindIndex = 1;
        
        if (filters.userId) {
            sql += ` AND a.User_ID = :${bindIndex}`;
            binds.push(filters.userId);
            bindIndex++;
        }
        
        if (filters.tableName) {
            sql += ` AND a.Table_Name = :${bindIndex}`;
            binds.push(filters.tableName);
            bindIndex++;
        }
        
        if (filters.operation) {
            sql += ` AND a.Operation = :${bindIndex}`;
            binds.push(filters.operation);
            bindIndex++;
        }
        
        if (filters.startDate) {
            sql += ` AND a.Timestamp >= :${bindIndex}`;
            binds.push(filters.startDate);
            bindIndex++;
        }
        
        if (filters.endDate) {
            sql += ` AND a.Timestamp <= :${bindIndex}`;
            binds.push(filters.endDate);
            bindIndex++;
        }
        
        const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
        const countResult = await db.executeQuery(countSql, binds);
        const total = countResult.rows[0].total;
        
        sql += ` ORDER BY a.Timestamp DESC 
                OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;
        
        const offset = (page - 1) * limit;
        binds.push(offset, limit);
        
        const result = await db.executeQuery(sql, binds);
        
        return {
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getAuditLogsByRecord(tableName, recordId) {
        const sql = `
            SELECT a.*, u.Username, p.Name AS User_Name
            FROM Audit_Log a
            LEFT JOIN User_Account u ON a.User_ID = u.User_ID
            LEFT JOIN Person p ON u.Person_ID = p.Person_ID
            WHERE a.Table_Name = :tableName 
            AND a.Record_ID = :recordId
            ORDER BY a.Timestamp DESC
        `;
        
        const result = await db.executeQuery(sql, [tableName, recordId]);
        return result.rows;
    }

    async getRecentActivities(limit = 20) {
        const sql = `
            SELECT a.*, u.Username, p.Name AS User_Name
            FROM Audit_Log a
            LEFT JOIN User_Account u ON a.User_ID = u.User_ID
            LEFT JOIN Person p ON u.Person_ID = p.Person_ID
            ORDER BY a.Timestamp DESC
            FETCH FIRST :limit ROWS ONLY
        `;
        
        const result = await db.executeQuery(sql, [limit]);
        return result.rows;
    }
}

module.exports = new AuditModel();