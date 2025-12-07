// PersonModel.js
const BaseModel = require("./BaseModel");
const db = require("../config/database");
const oracledb = require("oracledb");

class PersonModel extends BaseModel {
  constructor() {
    super("PERSON");
    this.primaryKey = "PERSON_ID";
  }

  async createPerson(personData) {
    console.log('PersonModel.createPerson received:', personData);
    
    // Handle ALL possible case variations
    const nameValue = personData.NAME || personData.Name || personData.name;
    const emailValue = personData.EMAIL || personData.Email || personData.email;
    const contactValue = personData.CONTACT_NO || personData.Contact_No || personData.contact_no;
    const addressValue = personData.ADDRESS || personData.Address || personData.address;
    const ageValue = personData.AGE || personData.Age || personData.age;
    
    console.log('Processed values:', {
        nameValue, emailValue, contactValue, addressValue, ageValue
    });
    
    if (!nameValue) {
        throw new Error('NAME field is required but was null or empty');
    }
    
    const sql = `
        INSERT INTO PERSON (
            PERSON_ID, NAME, AGE, CONTACT_NO, EMAIL, ADDRESS, CREATED_DATE
        ) VALUES (
            SEQ_PERSON_ID.NEXTVAL, :NAME, :AGE, :CONTACT_NO, :EMAIL, :ADDRESS, SYSDATE
        ) RETURNING PERSON_ID INTO :id
    `;

    const binds = {
        NAME: nameValue,
        AGE: ageValue || null,
        CONTACT_NO: contactValue || null,
        EMAIL: emailValue || null,
        ADDRESS: addressValue || null,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    };

    console.log('Executing SQL with binds:', binds);
    
    const result = await db.executeQuery(sql, binds, { autoCommit: true });
    
    if (!result.success) {
        console.error('Database error in createPerson:', result.error);
        throw new Error(`Database error: ${result.error || 'Unknown error'}`);
    }
    
    console.log('Person created with ID:', result.outBinds.id[0]);
    return result.outBinds.id[0];
  }

  async updatePerson(personId, personData) {
    const sql = `
        UPDATE PERSON 
        SET NAME = :NAME,
            AGE = :AGE,
            CONTACT_NO = :CONTACT_NO,
            EMAIL = :EMAIL,
            ADDRESS = :ADDRESS,
            MODIFIED_DATE = SYSDATE
        WHERE PERSON_ID = :PERSON_ID
    `;

    await db.executeQuery(sql, {
      NAME: personData.NAME,
      AGE: personData.AGE || null,
      CONTACT_NO: personData.CONTACT_NO || null,
      EMAIL: personData.EMAIL || null,
      ADDRESS: personData.ADDRESS || null,
      PERSON_ID: personId,
    }, { autoCommit: true });

    return true;
  }

  async searchPersons(searchTerm) {
    const sql = `
        SELECT * FROM PERSON 
        WHERE UPPER(NAME) LIKE UPPER(:searchTerm)
           OR UPPER(EMAIL) LIKE UPPER(:searchTerm)
           OR UPPER(CONTACT_NO) LIKE UPPER(:searchTerm)
        ORDER BY NAME
    `;

    const result = await db.executeQuery(sql, [`%${searchTerm}%`]);
    return result.rows;
  }

  async findByEmail(email) {
    const sql = "SELECT * FROM PERSON WHERE EMAIL = :email";
    const result = await db.executeQuery(sql, [email]);
    return result.rows[0] || null;
  }

  async findById(personId) {
    const sql = "SELECT * FROM PERSON WHERE PERSON_ID = :personId";
    const result = await db.executeQuery(sql, [personId]);
    return result.rows[0] || null;
  }

  async getAll(limit = 100, offset = 0, searchTerm = '') {
    let sql;
    let binds = [];
    
    if (searchTerm) {
        sql = `
            SELECT * FROM PERSON 
            WHERE UPPER(NAME) LIKE UPPER(:searchTerm)
               OR UPPER(EMAIL) LIKE UPPER(:searchTerm)
               OR UPPER(CONTACT_NO) LIKE UPPER(:searchTerm)
            ORDER BY NAME
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `;
        binds = [`%${searchTerm}%`, offset, limit];
    } else {
        sql = `
            SELECT * FROM PERSON 
            ORDER BY PERSON_ID
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `;
        binds = [offset, limit];
    }
    
    const result = await db.executeQuery(sql, binds);
    return result.rows || [];
  }

  async count(searchTerm = '') {
    let sql;
    let binds = [];
    
    if (searchTerm) {
        sql = `
            SELECT COUNT(*) as total 
            FROM PERSON 
            WHERE UPPER(NAME) LIKE UPPER(:searchTerm)
               OR UPPER(EMAIL) LIKE UPPER(:searchTerm)
               OR UPPER(CONTACT_NO) LIKE UPPER(:searchTerm)
        `;
        binds = [`%${searchTerm}%`];
    } else {
        sql = 'SELECT COUNT(*) as total FROM PERSON';
    }
    
    const result = await db.executeQuery(sql, binds);
    
    if (result.rows && result.rows.length > 0) {
        // Oracle returns count as an array, so we need to access it properly
        const count = result.rows[0].TOTAL || result.rows[0][0] || 0;
        return parseInt(count) || 0;
    }
    
    return 0;
  }

  async deletePerson(personId) {
    const sql = "DELETE FROM PERSON WHERE PERSON_ID = :personId";
    const result = await db.executeQuery(sql, [personId], { autoCommit: true });
    return result.rowsAffected > 0;
  }
}

module.exports = new PersonModel();