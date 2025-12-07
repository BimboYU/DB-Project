const db = require('../config/database');
const oracledb = require('oracledb');

class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
        this.primaryKey = `${tableName.split('_').map(word => word.toUpperCase()).join('_')}_ID`;
    }

    async count(conditions = {}) {
        let sql = `SELECT COUNT(*) as TOTAL FROM ${this.tableName}`;
        const binds = [];
        
        if (Object.keys(conditions).length > 0) {
            const whereClauses = [];
            Object.entries(conditions).forEach(([key, value], index) => {
                whereClauses.push(`${key} = :${index + 1}`);
                binds.push(value);
            });
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        const result = await db.executeQuery(sql, binds);
        
        if (result.success && result.rows.length > 0) {
            return result.rows[0].TOTAL;
        }
        return 0;
    }

    async findAll(conditions = {}, options = {}) {
        let sql = `SELECT * FROM ${this.tableName}`;
        const binds = [];
        
        if (Object.keys(conditions).length > 0) {
            const whereClauses = [];
            Object.entries(conditions).forEach(([key, value], index) => {
                whereClauses.push(`${key} = :${index + 1}`);
                binds.push(value);
            });
            sql += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        if (options.orderBy) {
            const orderByColumns = options.orderBy.split(',').map(col => col.trim()).join(', ');
            sql += ` ORDER BY ${orderByColumns}`;
        }
        
        if (options.offset) {
            sql += ` OFFSET ${parseInt(options.offset)} ROWS`;
        }
        
        if (options.limit) {
            sql += ` FETCH FIRST ${parseInt(options.limit)} ROWS ONLY`;
        }
        
        const result = await db.executeQuery(sql, binds);
        return result.rows;
    }

    async findById(id) {
        const sql = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = :1`;
        const result = await db.executeQuery(sql, [id]);
        return result.rows[0] || null;
    }

    async create(data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map((_, i) => `:${i + 1}`).join(', ');
        const values = Object.values(data);
        
        const sql = `
            INSERT INTO ${this.tableName} (${columns})
            VALUES (${placeholders})
            RETURNING ${this.primaryKey} INTO :id
        `;
        
        const binds = [...values, { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }];
        const result = await db.executeQuery(sql, binds);
        return result.outBinds?.id?.[0] || null;
    }

    async update(id, data) {
        const setClauses = Object.keys(data).map((key, i) => `${key} = :${i + 1}`).join(', ');
        const values = Object.values(data);
        values.push(id);
        
        const sql = `
            UPDATE ${this.tableName}
            SET ${setClauses}
            WHERE ${this.primaryKey} = :${values.length}
        `;
        
        await db.executeQuery(sql, values);
        return true;
    }

    async delete(id) {
        const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = :1`;
        await db.executeQuery(sql, [id]);
        return true;
    }
}

module.exports = BaseModel;