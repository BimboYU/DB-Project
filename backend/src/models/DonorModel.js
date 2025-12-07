const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class DonorModel extends BaseModel {
    constructor() {
        super('Donor');
        this.primaryKey = 'Donor_ID';
    }

    async createDonor(personId) {
        const sql = `
            INSERT INTO Donor (Donor_ID, Person_ID, Number_Of_Times_Donated, Last_Donation_Date)
            VALUES (seq_donor_id.NEXTVAL, :personId, 0, NULL)
            RETURNING Donor_ID INTO :id
        `;
        
        const binds = {
            personId,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await db.executeQuery(sql, binds);
        return result.outBinds.id[0];
    }

    async getDonorWithDetails(donorId) {
        const sql = `
            SELECT d.*, p.Name, p.Email, p.Contact_No, p.Address, p.Age
            FROM Donor d
            JOIN Person p ON d.Person_ID = p.Person_ID
            WHERE d.Donor_ID = :donorId
        `;
        const result = await db.executeQuery(sql, [donorId]);
        return result.rows[0] || null;
    }

    async getTopDonors(limit = 10) {
        const sql = `
            SELECT d.*, p.Name, p.Email, d.Number_Of_Times_Donated
            FROM Donor d
            JOIN Person p ON d.Person_ID = p.Person_ID
            ORDER BY d.Number_Of_Times_Donated DESC
            FETCH FIRST :limit ROWS ONLY
        `;
        const result = await db.executeQuery(sql, [limit]);
        return result.rows;
    }

    async getDonorsByDonationCount(minDonations) {
        const sql = `
            SELECT d.*, p.Name, p.Email, p.Contact_No
            FROM Donor d
            JOIN Person p ON d.Person_ID = p.Person_ID
            WHERE d.Number_Of_Times_Donated >= :minDonations
            ORDER BY d.Number_Of_Times_Donated DESC
        `;
        const result = await db.executeQuery(sql, [minDonations]);
        return result.rows;
    }

    async searchDonorsByName(name) {
        const sql = `
            SELECT d.*, p.Name, p.Email, p.Contact_No
            FROM Donor d
            JOIN Person p ON d.Person_ID = p.Person_ID
            WHERE UPPER(p.Name) LIKE UPPER(:name)
            ORDER BY p.Name
        `;
        const result = await db.executeQuery(sql, [`%${name}%`]);
        return result.rows;
    }

    async updateDonorStats(donorId) {
        const sql = `
            UPDATE Donor d
            SET d.Number_Of_Times_Donated = (
                SELECT COUNT(*) 
                FROM Donations 
                WHERE Donor_ID = d.Donor_ID
            ),
            d.Last_Donation_Date = (
                SELECT MAX(Donation_Date) 
                FROM Donations 
                WHERE Donor_ID = d.Donor_ID
            )
            WHERE d.Donor_ID = :donorId
        `;
        await db.executeQuery(sql, [donorId]);
    }
}

module.exports = new DonorModel();