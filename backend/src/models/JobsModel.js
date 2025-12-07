const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class JobsModel extends BaseModel {
    constructor() {
        super('Jobs');
        this.primaryKey = 'Job_ID';
    }

    async createJob(personId, jobData) {
        const sql = `
            INSERT INTO Jobs (
                Job_ID, Person_ID, Salary, Start_Date, End_Date,
                Job_Description, Job_Title
            ) VALUES (
                seq_job_id.NEXTVAL, :Person_ID, :Salary, :Start_Date,
                :End_Date, :Job_Description, :Job_Title
            ) RETURNING Job_ID INTO :id
        `;
        
        const binds = {
            Person_ID: personId,
            Salary: jobData.Salary || null,
            Start_Date: jobData.Start_Date || new Date(),
            End_Date: jobData.End_Date || null,
            Job_Description: jobData.Job_Description || null,
            Job_Title: jobData.Job_Title || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await db.executeQuery(sql, binds);
        return result.outBinds.id[0];
    }

    async getActiveStaff() {
        const sql = `
            SELECT j.*, p.Name, p.Email, p.Contact_No, p.Address
            FROM Jobs j
            JOIN Person p ON j.Person_ID = p.Person_ID
            WHERE j.End_Date IS NULL
            ORDER BY j.Job_Title, p.Name
        `;
        const result = await db.executeQuery(sql);
        return result.rows;
    }

    async getStaffByTitle(jobTitle) {
        const sql = `
            SELECT j.*, p.Name, p.Email, p.Contact_No
            FROM Jobs j
            JOIN Person p ON j.Person_ID = p.Person_ID
            WHERE UPPER(j.Job_Title) LIKE UPPER(:jobTitle)
            AND j.End_Date IS NULL
            ORDER BY p.Name
        `;
        const result = await db.executeQuery(sql, [`%${jobTitle}%`]);
        return result.rows;
    }

    async terminateJob(jobId, endDate) {
        const sql = 'UPDATE Jobs SET End_Date = :endDate WHERE Job_ID = :jobId';
        await db.executeQuery(sql, [endDate || new Date(), jobId]);
    }

    async updateSalary(jobId, newSalary) {
        const sql = 'UPDATE Jobs SET Salary = :salary WHERE Job_ID = :jobId';
        await db.executeQuery(sql, [newSalary, jobId]);
    }

    async getJobWithDetails(jobId) {
        const sql = `
            SELECT j.*, p.Name, p.Email, p.Contact_No, p.Address, p.Age
            FROM Jobs j
            JOIN Person p ON j.Person_ID = p.Person_ID
            WHERE j.Job_ID = :jobId
        `;
        const result = await db.executeQuery(sql, [jobId]);
        return result.rows[0] || null;
    }
}

module.exports = new JobsModel();