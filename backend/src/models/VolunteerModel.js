const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class VolunteerModel extends BaseModel {
    constructor() {
        super('Volunteer');
        this.primaryKey = 'Volunteer_ID';
    }

    async createVolunteer(personId, volunteerData) {
        const sql = `
            INSERT INTO Volunteer (
                Volunteer_ID, Person_ID, Skills, V_Availability, 
                Experience_Level, Volunteering_Hours, Join_Date
            ) VALUES (
                seq_volunteer_id.NEXTVAL, :Person_ID, :Skills, :V_Availability,
                :Experience_Level, 0, SYSDATE
            ) RETURNING Volunteer_ID INTO :id
        `;
        
        const binds = {
            Person_ID: personId,
            Skills: volunteerData.Skills || null,
            V_Availability: volunteerData.V_Availability || null,
            Experience_Level: volunteerData.Experience_Level || 'Beginner',
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await db.executeQuery(sql, binds);
        return result.outBinds.id[0];
    }

    async updateVolunteerHours(volunteerId, hours) {
        const sql = `
            UPDATE Volunteer 
            SET Volunteering_Hours = Volunteering_Hours + :hours 
            WHERE Volunteer_ID = :volunteerId
        `;
        await db.executeQuery(sql, [hours, volunteerId]);
    }

    async getVolunteerWithDetails(volunteerId) {
        const sql = `
            SELECT v.*, p.Name, p.Email, p.Contact_No, p.Address, p.Age
            FROM Volunteer v
            JOIN Person p ON v.Person_ID = p.Person_ID
            WHERE v.Volunteer_ID = :volunteerId
        `;
        const result = await db.executeQuery(sql, [volunteerId]);
        return result.rows[0] || null;
    }

    async searchVolunteersBySkill(skill) {
        const sql = `
            SELECT v.*, p.Name, p.Email, p.Contact_No
            FROM Volunteer v
            JOIN Person p ON v.Person_ID = p.Person_ID
            WHERE UPPER(v.Skills) LIKE UPPER(:skill)
            ORDER BY p.Name
        `;
        const result = await db.executeQuery(sql, [`%${skill}%`]);
        return result.rows;
    }

    async getVolunteersByAvailability(availability) {
        const sql = `
            SELECT v.*, p.Name, p.Email, p.Contact_No
            FROM Volunteer v
            JOIN Person p ON v.Person_ID = p.Person_ID
            WHERE v.V_Availability LIKE :availability
            ORDER BY p.Name
        `;
        const result = await db.executeQuery(sql, [`%${availability}%`]);
        return result.rows;
    }

    async getTopVolunteers(limit = 10) {
        const sql = `
            SELECT v.*, p.Name, p.Email, v.Volunteering_Hours
            FROM Volunteer v
            JOIN Person p ON v.Person_ID = p.Person_ID
            ORDER BY v.Volunteering_Hours DESC
            FETCH FIRST :limit ROWS ONLY
        `;
        const result = await db.executeQuery(sql, [limit]);
        return result.rows;
    }
}

module.exports = new VolunteerModel();