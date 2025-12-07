// DonationModel.js
const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class DonationModel extends BaseModel {
    constructor() {
        super('DONATIONS');
        this.primaryKey = 'DONATION_ID';
    }

    async createMonetaryDonation(donationData) {
        let connection;
        try {
            connection = await db.getConnection();
            await connection.execute('BEGIN');
            
            // Insert into DONATIONS
            const donationSql = `
                INSERT INTO DONATIONS (
                    DONATION_ID, DONATION_DATE, DONOR_ID, CAMPAIGN_ID
                ) VALUES (
                    SEQ_DONATION_ID.NEXTVAL, SYSDATE, :DONOR_ID, :CAMPAIGN_ID
                ) RETURNING DONATION_ID INTO :id
            `;
            
            const donationBinds = {
                DONOR_ID: donationData.DONOR_ID,
                CAMPAIGN_ID: donationData.CAMPAIGN_ID || null,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            };
            
            const donationResult = await connection.execute(donationSql, donationBinds);
            const donationId = donationResult.outBinds.id[0];
            
            // Insert into MONETARY_DONATION
            const monetarySql = `
                INSERT INTO MONETARY_DONATION (
                    DONATION_ID, AMOUNT, PAYMENT_METHOD, TRANSACTION_ID
                ) VALUES (
                    :DONATION_ID, :AMOUNT, :PAYMENT_METHOD, :TRANSACTION_ID
                )
            `;
            
            const monetaryBinds = {
                DONATION_ID: donationId,
                AMOUNT: donationData.AMOUNT,
                PAYMENT_METHOD: donationData.PAYMENT_METHOD || null,
                TRANSACTION_ID: donationData.TRANSACTION_ID || null
            };
            
            await connection.execute(monetarySql, monetaryBinds);
            
            // Update Donor stats
            await connection.execute(
                `UPDATE DONOR SET 
                    NUMBER_OF_TIMES_DONATED = NUMBER_OF_TIMES_DONATED + 1,
                    LAST_DONATION_DATE = SYSDATE
                 WHERE DONOR_ID = :DONOR_ID`,
                [donationData.DONOR_ID]
            );
            
            // Update Campaign amount if campaign exists
            if (donationData.CAMPAIGN_ID) {
                await connection.execute(
                    `UPDATE CAMPAIGN 
                     SET CURRENT_AMOUNT = CURRENT_AMOUNT + :AMOUNT 
                     WHERE CAMPAIGN_ID = :CAMPAIGN_ID`,
                    [donationData.AMOUNT, donationData.CAMPAIGN_ID]
                );
            }
            
            await connection.execute('COMMIT');
            return donationId;
        } catch (error) {
            if (connection) {
                await connection.execute('ROLLBACK');
            }
            throw error;
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

    async getDonationWithDetails(donationId) {
        const sql = `
            SELECT 
                d.*,
                md.AMOUNT, md.PAYMENT_METHOD, md.TRANSACTION_ID,
                p.NAME AS DONOR_NAME, p.EMAIL AS DONOR_EMAIL,
                c.CAMPAIGN_NAME
            FROM DONATIONS d
            JOIN MONETARY_DONATION md ON d.DONATION_ID = md.DONATION_ID
            JOIN DONOR dr ON d.DONOR_ID = dr.DONOR_ID
            JOIN PERSON p ON dr.PERSON_ID = p.PERSON_ID
            LEFT JOIN CAMPAIGN c ON d.CAMPAIGN_ID = c.CAMPAIGN_ID
            WHERE d.DONATION_ID = :donationId
        `;
        
        const result = await db.executeQuery(sql, [donationId]);
        return result.rows[0] || null;
    }

    async getDonationsByCampaign(campaignId) {
        const sql = `
            SELECT 
                d.*,
                md.AMOUNT, md.PAYMENT_METHOD,
                p.NAME AS DONOR_NAME, p.EMAIL
            FROM DONATIONS d
            JOIN MONETARY_DONATION md ON d.DONATION_ID = md.DONATION_ID
            JOIN DONOR dr ON d.DONOR_ID = dr.DONOR_ID
            JOIN PERSON p ON dr.PERSON_ID = p.PERSON_ID
            WHERE d.CAMPAIGN_ID = :campaignId
            ORDER BY d.DONATION_DATE DESC
        `;
        
        const result = await db.executeQuery(sql, [campaignId]);
        return result.rows;
    }

    async getDonationSummary(startDate, endDate) {
        const sql = `
            SELECT 
                TO_CHAR(d.DONATION_DATE, 'YYYY-MM') AS MONTH,
                COUNT(*) AS DONATION_COUNT,
                SUM(md.AMOUNT) AS TOTAL_AMOUNT,
                AVG(md.AMOUNT) AS AVERAGE_AMOUNT,
                MAX(md.AMOUNT) AS MAX_DONATION,
                MIN(md.AMOUNT) AS MIN_DONATION
            FROM DONATIONS d
            JOIN MONETARY_DONATION md ON d.DONATION_ID = md.DONATION_ID
            WHERE d.DONATION_DATE BETWEEN :startDate AND :endDate
            GROUP BY TO_CHAR(d.DONATION_DATE, 'YYYY-MM')
            ORDER BY MONTH DESC
        `;
        
        const result = await db.executeQuery(sql, [startDate, endDate]);
        return result.rows;
    }
}

module.exports = new DonationModel();