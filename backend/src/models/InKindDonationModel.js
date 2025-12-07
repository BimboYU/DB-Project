// InKindDonationModel.js
const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class InKindDonationModel extends BaseModel {
    constructor() {
        super('IN_KIND_DONATION');
        this.primaryKey = 'DONATION_ID';
    }

    async createInKindDonation(donationData) {
        let connection;
        try {
            connection = await db.getConnection();
            await connection.execute('BEGIN');
            
            // Insert into DONATIONS (note: DONATION_DATE not DATE)
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
            
            // Insert into IN_KIND_DONATION
            const inKindSql = `
                INSERT INTO IN_KIND_DONATION (
                    DONATION_ID, I_DESCRIPTION, QUANTITY, ESTIMATED_VALUE, I_CATEGORY
                ) VALUES (
                    :DONATION_ID, :I_DESCRIPTION, :QUANTITY, :ESTIMATED_VALUE, :I_CATEGORY
                )
            `;
            
            const inKindBinds = {
                DONATION_ID: donationId,
                I_DESCRIPTION: donationData.I_DESCRIPTION,
                QUANTITY: donationData.QUANTITY || 1,
                ESTIMATED_VALUE: donationData.ESTIMATED_VALUE || null,
                I_CATEGORY: donationData.I_CATEGORY
            };
            
            await connection.execute(inKindSql, inKindBinds);
            
            // Update Donor stats
            await connection.execute(
                `UPDATE DONOR SET 
                    NUMBER_OF_TIMES_DONATED = NUMBER_OF_TIMES_DONATED + 1,
                    LAST_DONATION_DATE = SYSDATE
                 WHERE DONOR_ID = :DONOR_ID`,
                [donationData.DONOR_ID]
            );
            
            // Insert into specific category table
            await this.insertIntoCategoryTable(connection, donationId, donationData);
            
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

    async insertIntoCategoryTable(connection, donationId, donationData) {
        const category = donationData.I_CATEGORY;
        const categoryData = donationData.categoryData || {};
        
        switch (category.toUpperCase()) {
            case 'HEALTHCARE':
                const healthcareSql = `
                    INSERT INTO HEALTHCARE_DONATIONS (
                        DONATION_ID, H_TYPE, IS_ORAL, EXPIRY_DATE, BRAND
                    ) VALUES (
                        :DONATION_ID, :H_TYPE, :IS_ORAL, :EXPIRY_DATE, :BRAND
                    )
                `;
                await connection.execute(healthcareSql, [
                    donationId,
                    categoryData.H_TYPE || null,
                    categoryData.IS_ORAL || null,
                    categoryData.EXPIRY_DATE || null,
                    categoryData.BRAND || null
                ]);
                break;
                
            case 'CLOTHES':
                const clothesSql = `
                    INSERT INTO CLOTHES_DONATIONS (
                        DONATION_ID, AGE_GROUP, GENDER, C_SIZE, C_CONDITION, C_TYPE
                    ) VALUES (
                        :DONATION_ID, :AGE_GROUP, :GENDER, :C_SIZE, :C_CONDITION, :C_TYPE
                    )
                `;
                await connection.execute(clothesSql, [
                    donationId,
                    categoryData.AGE_GROUP || null,
                    categoryData.GENDER || null,
                    categoryData.C_SIZE || null,
                    categoryData.C_CONDITION || null,
                    categoryData.C_TYPE || null
                ]);
                break;
                
            case 'FOOD':
                const foodSql = `
                    INSERT INTO FOOD_DONATIONS (
                        DONATION_ID, F_TYPE, IS_PERISHABLE, EXPIRY_DATE, QUANTITY_UNIT
                    ) VALUES (
                        :DONATION_ID, :F_TYPE, :IS_PERISHABLE, :EXPIRY_DATE, :QUANTITY_UNIT
                    )
                `;
                await connection.execute(foodSql, [
                    donationId,
                    categoryData.F_TYPE || null,
                    categoryData.IS_PERISHABLE || null,
                    categoryData.EXPIRY_DATE || null,
                    categoryData.QUANTITY_UNIT || null
                ]);
                break;
                
            case 'ELECTRONICS':
                const electronicsSql = `
                    INSERT INTO ELECTRONICS_DONATIONS (
                        DONATION_ID, E_TYPE, BRAND, E_MODEL, WORKING_CONDITION, AGE_OF_ITEM
                    ) VALUES (
                        :DONATION_ID, :E_TYPE, :BRAND, :E_MODEL, :WORKING_CONDITION, :AGE_OF_ITEM
                    )
                `;
                await connection.execute(electronicsSql, [
                    donationId,
                    categoryData.E_TYPE || null,
                    categoryData.BRAND || null,
                    categoryData.E_MODEL || null,
                    categoryData.WORKING_CONDITION || null,
                    categoryData.AGE_OF_ITEM || null
                ]);
                break;
                
            case 'SHOES':
                const shoesSql = `
                    INSERT INTO SHOES_DONATIONS (
                        DONATION_ID, S_SIZE, GENDER, S_CONDITION, S_TYPE
                    ) VALUES (
                        :DONATION_ID, :S_SIZE, :GENDER, :S_CONDITION, :S_TYPE
                    )
                `;
                await connection.execute(shoesSql, [
                    donationId,
                    categoryData.S_SIZE || null,
                    categoryData.GENDER || null,
                    categoryData.S_CONDITION || null,
                    categoryData.S_TYPE || null
                ]);
                break;
                
            case 'SANITARY':
                const sanitarySql = `
                    INSERT INTO SANITARY_DONATIONS (
                        DONATION_ID, S_SIZE, PRODUCT_TYPE, GENDER, BRAND
                    ) VALUES (
                        :DONATION_ID, :S_SIZE, :PRODUCT_TYPE, :GENDER, :BRAND
                    )
                `;
                await connection.execute(sanitarySql, [
                    donationId,
                    categoryData.S_SIZE || null,
                    categoryData.PRODUCT_TYPE || null,
                    categoryData.GENDER || null,
                    categoryData.BRAND || null
                ]);
                break;
        }
    }

    async getInKindDonationsByCategory(category) {
        const sql = `
            SELECT ik.*, d.DONATION_DATE, d.DONOR_ID, p.NAME AS DONOR_NAME
            FROM IN_KIND_DONATION ik
            JOIN DONATIONS d ON ik.DONATION_ID = d.DONATION_ID
            JOIN DONOR dr ON d.DONOR_ID = dr.DONOR_ID
            JOIN PERSON p ON dr.PERSON_ID = p.PERSON_ID
            WHERE UPPER(ik.I_CATEGORY) = UPPER(:category)
            ORDER BY d.DONATION_DATE DESC
        `;
        const result = await db.executeQuery(sql, [category]);
        return result.rows;
    }

    async getInKindDonationDetails(donationId) {
        const sql = `
            SELECT 
                ik.*, d.DONATION_DATE, d.DONOR_ID, d.CAMPAIGN_ID,
                p.NAME AS DONOR_NAME, c.CAMPAIGN_NAME,
                hd.H_TYPE AS HEALTHCARE_TYPE, hd.IS_ORAL, hd.EXPIRY_DATE AS HEALTHCARE_EXPIRY, hd.BRAND AS HEALTHCARE_BRAND,
                cd.AGE_GROUP AS CLOTHES_AGE_GROUP, cd.GENDER AS CLOTHES_GENDER,
                cd.C_SIZE AS CLOTHES_SIZE, cd.C_CONDITION AS CLOTHES_CONDITION, cd.C_TYPE AS CLOTHES_TYPE,
                fd.F_TYPE AS FOOD_TYPE, fd.IS_PERISHABLE, fd.EXPIRY_DATE AS FOOD_EXPIRY, fd.QUANTITY_UNIT,
                ed.E_TYPE AS ELECTRONICS_TYPE, ed.BRAND AS ELECTRONICS_BRAND, ed.E_MODEL,
                ed.WORKING_CONDITION AS ELECTRONICS_WORKING, ed.AGE_OF_ITEM,
                sd.S_SIZE AS SHOES_SIZE, sd.GENDER AS SHOES_GENDER,
                sd.S_CONDITION AS SHOES_CONDITION, sd.S_TYPE AS SHOES_TYPE,
                sand.S_SIZE AS SANITARY_SIZE, sand.PRODUCT_TYPE, sand.GENDER AS SANITARY_GENDER, sand.BRAND AS SANITARY_BRAND
            FROM IN_KIND_DONATION ik
            JOIN DONATIONS d ON ik.DONATION_ID = d.DONATION_ID
            JOIN DONOR dr ON d.DONOR_ID = dr.DONOR_ID
            JOIN PERSON p ON dr.PERSON_ID = p.PERSON_ID
            LEFT JOIN CAMPAIGN c ON d.CAMPAIGN_ID = c.CAMPAIGN_ID
            LEFT JOIN HEALTHCARE_DONATIONS hd ON ik.DONATION_ID = hd.DONATION_ID
            LEFT JOIN CLOTHES_DONATIONS cd ON ik.DONATION_ID = cd.DONATION_ID
            LEFT JOIN FOOD_DONATIONS fd ON ik.DONATION_ID = fd.DONATION_ID
            LEFT JOIN ELECTRONICS_DONATIONS ed ON ik.DONATION_ID = ed.DONATION_ID
            LEFT JOIN SHOES_DONATIONS sd ON ik.DONATION_ID = sd.DONATION_ID
            LEFT JOIN SANITARY_DONATIONS sand ON ik.DONATION_ID = sand.DONATION_ID
            WHERE ik.DONATION_ID = :donationId
        `;
        const result = await db.executeQuery(sql, [donationId]);
        return result.rows[0] || null;
    }

    async getInKindSummary(startDate, endDate) {
        const sql = `
            SELECT 
                ik.I_CATEGORY,
                COUNT(*) AS DONATION_COUNT,
                SUM(ik.QUANTITY) AS TOTAL_QUANTITY,
                SUM(ik.ESTIMATED_VALUE) AS TOTAL_VALUE,
                TO_CHAR(d.DONATION_DATE, 'YYYY-MM') AS MONTH
            FROM IN_KIND_DONATION ik
            JOIN DONATIONS d ON ik.DONATION_ID = d.DONATION_ID
            WHERE d.DONATION_DATE BETWEEN :startDate AND :endDate
            GROUP BY ik.I_CATEGORY, TO_CHAR(d.DONATION_DATE, 'YYYY-MM')
            ORDER BY MONTH DESC, TOTAL_VALUE DESC
        `;
        
        const result = await db.executeQuery(sql, [startDate, endDate]);
        return result.rows;
    }
}

module.exports = new InKindDonationModel();