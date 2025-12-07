const BaseModel = require('./BaseModel');
const db = require('../config/database');
const oracledb = require('oracledb');

class BeneficiaryModel extends BaseModel {
    constructor() {
        super('Beneficiary');
        this.primaryKey = 'Beneficiary_ID';
    }

    async createBeneficiary(personId, beneficiaryData) {
        const sql = `
            INSERT INTO Beneficiary (
                Beneficiary_ID, Person_ID, Assistance_Type, Income_Level,
                Criminal_History, Total_Amount_Received, Dependents, Registration_Date
            ) VALUES (
                seq_beneficiary_id.NEXTVAL, :Person_ID, :Assistance_Type, :Income_Level,
                :Criminal_History, 0, :Dependents, SYSDATE
            ) RETURNING Beneficiary_ID INTO :id
        `;
        
        const binds = {
            Person_ID: personId,
            Assistance_Type: beneficiaryData.Assistance_Type || null,
            Income_Level: beneficiaryData.Income_Level || null,
            Criminal_History: beneficiaryData.Criminal_History || null,
            Dependents: beneficiaryData.Dependents || 0,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        };
        
        const result = await db.executeQuery(sql, binds);
        return result.outBinds.id[0];
    }

    async updateAmountReceived(beneficiaryId, amount) {
        const sql = `
            UPDATE Beneficiary 
            SET Total_Amount_Received = Total_Amount_Received + :amount 
            WHERE Beneficiary_ID = :beneficiaryId
        `;
        await db.executeQuery(sql, [amount, beneficiaryId]);
    }

    async getBeneficiaryWithDetails(beneficiaryId) {
        const sql = `
            SELECT b.*, p.Name, p.Email, p.Contact_No, p.Address, p.Age
            FROM Beneficiary b
            JOIN Person p ON b.Person_ID = p.Person_ID
            WHERE b.Beneficiary_ID = :beneficiaryId
        `;
        const result = await db.executeQuery(sql, [beneficiaryId]);
        return result.rows[0] || null;
    }

    async getBeneficiariesByAssistanceType(assistanceType) {
        const sql = `
            SELECT b.*, p.Name, p.Email, p.Contact_No
            FROM Beneficiary b
            JOIN Person p ON b.Person_ID = p.Person_ID
            WHERE b.Assistance_Type = :assistanceType
            ORDER BY p.Name
        `;
        const result = await db.executeQuery(sql, [assistanceType]);
        return result.rows;
    }

    async getBeneficiariesByIncomeLevel(incomeLevel) {
        const sql = `
            SELECT b.*, p.Name, p.Email, p.Contact_No
            FROM Beneficiary b
            JOIN Person p ON b.Person_ID = p.Person_ID
            WHERE b.Income_Level = :incomeLevel
            ORDER BY b.Total_Amount_Received DESC
        `;
        const result = await db.executeQuery(sql, [incomeLevel]);
        return result.rows;
    }

    async updateBeneficiaryDependents(beneficiaryId, dependents) {
        const sql = 'UPDATE Beneficiary SET Dependents = :dependents WHERE Beneficiary_ID = :beneficiaryId';
        await db.executeQuery(sql, [dependents, beneficiaryId]);
    }
}

module.exports = new BeneficiaryModel();