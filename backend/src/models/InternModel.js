const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class InternModel extends BaseModel {
    constructor() {
        super('Intern');
        this.primaryKey = 'Intern_ID';
    }

    async createIntern(personId, internData) {
        const sql = `
            INSERT INTO Intern (
                Intern_ID, Person_ID, I_Availability, Batch_Number, 
                Intern_Hours, Start_Date, End_Date, University, Field_Of_Study
            ) VALUES (
                seq_intern_id.NEXTVAL, :Person_ID, :I_Availability, :Batch_Number,
                0, :Start_Date, :End_Date, :University, :Field_Of_Study
            ) RETURNING Intern_ID INTO :id
        `;
        
        const binds = {
            Person_ID: personId,
            I_Availability: internData.I_Availability || null,
            Batch_Number: internData.Batch_Number || null,
            Start_Date: internData.Start_Date || new Date(),
            End_Date: internData.End_Date || null,
            University: internData.University || null,
            Field_Of_Study: internData.Field_Of_Study || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await db.executeQuery(sql, binds);
        return result.outBinds.id[0];
    }

    async getActiveInterns() {
        const sql = `
            SELECT i.*, p.Name, p.Email, p.Contact_No, p.Address
            FROM Intern i
            JOIN Person p ON i.Person_ID = p.Person_ID
            WHERE (i.End_Date IS NULL OR i.End_Date >= SYSDATE)
            ORDER BY i.Start_Date DESC
        `;
        const result = await db.executeQuery(sql);
        return result.rows;
    }

    async getInternsByUniversity(university) {
        const sql = `
            SELECT i.*, p.Name, p.Email, p.Contact_No
            FROM Intern i
            JOIN Person p ON i.Person_ID = p.Person_ID
            WHERE UPPER(i.University) LIKE UPPER(:university)
            ORDER BY p.Name
        `;
        const result = await db.executeQuery(sql, [`%${university}%`]);
        return result.rows;
    }

    async updateInternHours(internId, hours) {
        const sql = `
            UPDATE Intern 
            SET Intern_Hours = Intern_Hours + :hours 
            WHERE Intern_ID = :internId
        `;
        await db.executeQuery(sql, [hours, internId]);
    }

    async terminateIntern(internId, endDate) {
        const sql = `
            UPDATE Intern 
            SET End_Date = :endDate 
            WHERE Intern_ID = :internId
        `;
        await db.executeQuery(sql, [endDate || new Date(), internId]);
    }
}

module.exports = new InternModel();