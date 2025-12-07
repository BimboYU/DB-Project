const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class CampaignModel extends BaseModel {
    constructor() {
        super('Campaign');
        this.primaryKey = 'Campaign_ID';
    }

    async createCampaign(campaignData) {
        const sql = `
            INSERT INTO Campaign (
                Campaign_ID, Campaign_Name, Campaign_Type, Start_Date, End_Date,
                Goal_Amount, Current_Amount, Manager_ID, Status
            ) VALUES (
                seq_campaign_id.NEXTVAL, :Campaign_Name, :Campaign_Type, 
                :Start_Date, :End_Date, :Goal_Amount, 0, :Manager_ID, 'Active'
            ) RETURNING Campaign_ID INTO :id
        `;
        
        const binds = {
            Campaign_Name: campaignData.Campaign_Name,
            Campaign_Type: campaignData.Campaign_Type,
            Start_Date: campaignData.Start_Date || new Date(),
            End_Date: campaignData.End_Date || null,
            Goal_Amount: campaignData.Goal_Amount,
            Manager_ID: campaignData.Manager_ID || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await db.executeQuery(sql, binds);
        return result.outBinds.id[0];
    }

    async updateCampaignStatus(campaignId, status) {
        const sql = 'UPDATE Campaign SET Status = :status WHERE Campaign_ID = :campaignId';
        await db.executeQuery(sql, [status, campaignId]);
    }

    async updateCampaignAmount(campaignId, amount) {
        const sql = `
            UPDATE Campaign 
            SET Current_Amount = Current_Amount + :amount 
            WHERE Campaign_ID = :campaignId
        `;
        await db.executeQuery(sql, [amount, campaignId]);
    }

    async getCampaignWithDetails(campaignId) {
        const sql = `
            SELECT c.*, 
                   j.Job_ID, p.Name AS Manager_Name, p.Email AS Manager_Email,
                   (SELECT COUNT(*) FROM Donations WHERE Campaign_ID = c.Campaign_ID) AS Total_Donations,
                   (SELECT SUM(Amount) FROM Expense WHERE Campaign_ID = c.Campaign_ID) AS Total_Expenses
            FROM Campaign c
            LEFT JOIN Jobs j ON c.Manager_ID = j.Job_ID
            LEFT JOIN Person p ON j.Person_ID = p.Person_ID
            WHERE c.Campaign_ID = :campaignId
        `;
        const result = await db.executeQuery(sql, [campaignId]);
        return result.rows[0] || null;
    }

    async getActiveCampaigns() {
        const sql = `
            SELECT c.*, p.Name AS Manager_Name
            FROM Campaign c
            LEFT JOIN Jobs j ON c.Manager_ID = j.Job_ID
            LEFT JOIN Person p ON j.Person_ID = p.Person_ID
            WHERE c.Status = 'Active'
            ORDER BY c.Start_Date DESC
        `;
        const result = await db.executeQuery(sql);
        return result.rows;
    }

    async getCampaignsByType(campaignType) {
        const sql = `
            SELECT c.*, p.Name AS Manager_Name
            FROM Campaign c
            LEFT JOIN Jobs j ON c.Manager_ID = j.Job_ID
            LEFT JOIN Person p ON j.Person_ID = p.Person_ID
            WHERE c.Campaign_Type = :campaignType
            ORDER BY c.Start_Date DESC
        `;
        const result = await db.executeQuery(sql, [campaignType]);
        return result.rows;
    }

    async getCampaignProgress(campaignId) {
        const sql = `
            SELECT 
                c.Campaign_Name,
                c.Goal_Amount,
                c.Current_Amount,
                ROUND((c.Current_Amount / c.Goal_Amount) * 100, 2) AS Progress_Percentage,
                (SELECT COUNT(*) FROM Donations WHERE Campaign_ID = c.Campaign_ID) AS Donation_Count,
                (SELECT SUM(Amount) FROM Expense WHERE Campaign_ID = c.Campaign_ID) AS Expenses_Total
            FROM Campaign c
            WHERE c.Campaign_ID = :campaignId
        `;
        const result = await db.executeQuery(sql, [campaignId]);
        return result.rows[0] || null;
    }
}

module.exports = new CampaignModel();