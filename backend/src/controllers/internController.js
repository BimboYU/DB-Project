const InternModel = require('../models/InternModel');
const PersonModel = require('../models/PersonModel');

class InternController {
    async registerIntern(req, res) {
        try {
            const { 
                Name, Email, Contact_No, Address, Age,
                I_Availability, Batch_Number, University, Field_Of_Study,
                Start_Date, End_Date 
            } = req.body;
            
            // Validation
            if (!Name || !Email || !University) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, Email, and University are required'
                });
            }
            
            // Create or find person
            let person = await PersonModel.findByEmail(Email);
            let personId;
            
            if (!person) {
                personId = await PersonModel.create({
                    Name, Email, Contact_No, Address, Age: Age ? parseInt(Age) : null
                });
            } else {
                personId = person.PERSON_ID;
            }
            
            // Create intern record
            const internData = {
                I_Availability,
                Batch_Number,
                University,
                Field_Of_Study,
                Start_Date: Start_Date || new Date(),
                End_Date: End_Date || null
            };
            
            const internId = await InternModel.createIntern(personId, internData);
            
            res.status(201).json({
                success: true,
                message: 'Intern registered successfully',
                data: { internId, personId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error registering intern',
                error: error.message
            });
        }
    }

    async getAllInterns(req, res) {
        try {
            const { page = 1, limit = 100, activeOnly = 'true', university } = req.query;
            const offset = (page - 1) * limit;
            
            let interns;
            let total;
            
            if (activeOnly === 'true') {
                interns = await InternModel.getActiveInterns();
                total = interns.length;
            } else if (university) {
                interns = await InternModel.getInternsByUniversity(university);
                total = interns.length;
            } else {
                interns = await InternModel.findAll({}, limit, offset);
                total = await InternModel.count();
            }
            
            res.json({
                success: true,
                data: interns,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching interns',
                error: error.message
            });
        }
    }

    async getInternById(req, res) {
        try {
            const intern = await InternModel.findById(req.params.id);
            if (!intern) {
                return res.status(404).json({
                    success: false,
                    message: 'Intern not found'
                });
            }
            
            const person = await PersonModel.findById(intern.PERSON_ID);
            
            res.json({
                success: true,
                data: { ...intern, ...person }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching intern',
                error: error.message
            });
        }
    }

    async updateInternHours(req, res) {
        try {
            const { internId } = req.params;
            const { hours } = req.body;
            
            if (!hours || hours <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid hours required'
                });
            }
            
            await InternModel.updateInternHours(internId, parseFloat(hours));
            
            res.json({
                success: true,
                message: 'Intern hours updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating intern hours',
                error: error.message
            });
        }
    }

    async terminateIntern(req, res) {
        try {
            const { internId } = req.params;
            const { endDate } = req.body;
            
            await InternModel.terminateIntern(internId, endDate || new Date());
            
            res.json({
                success: true,
                message: 'Intern terminated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error terminating intern',
                error: error.message
            });
        }
    }

    async updateIntern(req, res) {
        try {
            const internId = req.params.id;
            const { 
                I_Availability, Batch_Number, University, 
                Field_Of_Study, End_Date 
            } = req.body;
            
            const intern = await InternModel.findById(internId);
            if (!intern) {
                return res.status(404).json({
                    success: false,
                    message: 'Intern not found'
                });
            }
            
            const updateData = {};
            if (I_Availability !== undefined) updateData.I_Availability = I_Availability;
            if (Batch_Number !== undefined) updateData.Batch_Number = Batch_Number;
            if (University !== undefined) updateData.University = University;
            if (Field_Of_Study !== undefined) updateData.Field_Of_Study = Field_Of_Study;
            if (End_Date !== undefined) updateData.End_Date = End_Date;
            
            const updated = await InternModel.update(internId, updateData);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Intern updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update intern'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating intern',
                error: error.message
            });
        }
    }
}

module.exports = new InternController();