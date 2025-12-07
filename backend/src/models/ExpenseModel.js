// ExpenseModel.js - UPDATED
const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class ExpenseModel extends BaseModel {
    constructor() {
        super('EXPENSE');
        this.primaryKey = 'EXPENSE_ID';
    }

    async createExpense(expenseData) {
        const sql = `
            INSERT INTO EXPENSE (
                EXPENSE_ID, E_DESCRIPTION, AMOUNT, EXPENSE_DATE,
                CAMPAIGN_ID, E_CATEGORY, APPROVED_BY
            ) VALUES (
                SEQ_EXPENSE_ID.NEXTVAL, :E_DESCRIPTION, :AMOUNT, SYSDATE,
                :CAMPAIGN_ID, :E_CATEGORY, :APPROVED_BY
            ) RETURNING EXPENSE_ID INTO :id
        `;
        
        const binds = {
            E_DESCRIPTION: expenseData.E_DESCRIPTION,
            AMOUNT: expenseData.AMOUNT,
            CAMPAIGN_ID: expenseData.CAMPAIGN_ID || null,
            E_CATEGORY: expenseData.E_CATEGORY || null,
            APPROVED_BY: expenseData.APPROVED_BY || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await db.executeQuery(sql, binds);
        return result.outBinds.id[0];
    }

    async getExpensesByCampaign(campaignId) {
        const sql = `
            SELECT e.*, p.Name AS Approver_Name, c.Campaign_Name
            FROM Expense e
            LEFT JOIN Jobs j ON e.Approved_By = j.Job_ID
            LEFT JOIN Person p ON j.Person_ID = p.Person_ID
            LEFT JOIN Campaign c ON e.Campaign_ID = c.Campaign_ID
            WHERE e.Campaign_ID = :campaignId
            ORDER BY e.Expense_Date DESC
        `;
        const result = await db.executeQuery(sql, [campaignId]);
        return result.rows;
    }

    async getExpenseSummary(startDate, endDate) {
        const sql = `
            SELECT 
                E_Category,
                COUNT(*) AS Count,
                SUM(Amount) AS Total_Amount,
                TO_CHAR(Expense_Date, 'YYYY-MM') AS Month
            FROM Expense
            WHERE Expense_Date BETWEEN :startDate AND :endDate
            GROUP BY E_Category, TO_CHAR(Expense_Date, 'YYYY-MM')
            ORDER BY Month DESC, Total_Amount DESC
        `;
        
        const result = await db.executeQuery(sql, [startDate, endDate]);
        return result.rows;
    }

    async getExpensesByCategory(category, startDate, endDate) {
        let sql = `
            SELECT e.*, p.Name AS Approver_Name, c.Campaign_Name
            FROM Expense e
            LEFT JOIN Jobs j ON e.Approved_By = j.Job_ID
            LEFT JOIN Person p ON j.Person_ID = p.Person_ID
            LEFT JOIN Campaign c ON e.Campaign_ID = c.Campaign_ID
            WHERE e.E_Category = :category
        `;
        
        const binds = [category];
        
        if (startDate && endDate) {
            sql += ` AND e.Expense_Date BETWEEN :startDate AND :endDate`;
            binds.push(startDate, endDate);
        }
        
        sql += ` ORDER BY e.Expense_Date DESC`;
        
        const result = await db.executeQuery(sql, binds);
        return result.rows;
    }

    async getTotalExpensesByPeriod(startDate, endDate) {
        const sql = `
            SELECT 
                SUM(Amount) AS Total_Amount,
                COUNT(*) AS Total_Count,
                AVG(Amount) AS Average_Amount
            FROM Expense
            WHERE Expense_Date BETWEEN :startDate AND :endDate
        `;
        
        const result = await db.executeQuery(sql, [startDate, endDate]);
        return result.rows[0] || null;
    }
}

module.exports = new ExpenseModel();