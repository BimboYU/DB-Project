const VolunteerModel = require('../models/VolunteerModel');
const PersonModel = require('../models/PersonModel');

class VolunteerController {
    async registerVolunteer(req, res) {
        try {
            const { 
                Name, Email, Contact_No, Address, Age,
                Skills, V_Availability, Experience_Level 
            } = req.body;
            
            // Validation
            if (!Name || !Email) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and Email are required'
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
            
            // Create volunteer record
            const volunteerId = await VolunteerModel.createVolunteer(personId, {
                Skills, V_Availability, Experience_Level
            });
            
            res.status(201).json({
                success: true,
                message: 'Volunteer registered successfully',
                data: { volunteerId, personId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error registering volunteer',
                error: error.message
            });
        }
    }

    async getAllVolunteers(req, res) {
        try {
            const { page = 1, limit = 100, skill, availability } = req.query;
            const offset = (page - 1) * limit;
            
            let volunteers;
            let total;
            
            if (skill) {
                volunteers = await VolunteerModel.searchVolunteersBySkill(skill);
                total = volunteers.length;
            } else if (availability) {
                volunteers = await VolunteerModel.getVolunteersByAvailability(availability);
                total = volunteers.length;
            } else {
                volunteers = await VolunteerModel.findAll({}, limit, offset);
                total = await VolunteerModel.count();
            }
            
            // Get person details for each volunteer
            const volunteersWithDetails = await Promise.all(
                volunteers.map(async (volunteer) => {
                    const person = await PersonModel.findById(volunteer.PERSON_ID);
                    return { 
                        volunteerId: volunteer.VOLUNTEER_ID,
                        personId: volunteer.PERSON_ID,
                        ...volunteer,
                        ...person 
                    };
                })
            );
            
            res.json({
                success: true,
                data: volunteersWithDetails,
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
                message: 'Error fetching volunteers',
                error: error.message
            });
        }
    }

    async getVolunteerById(req, res) {
        try {
            const volunteer = await VolunteerModel.getVolunteerWithDetails(req.params.id);
            if (!volunteer) {
                return res.status(404).json({
                    success: false,
                    message: 'Volunteer not found'
                });
            }
            
            res.json({
                success: true,
                data: volunteer
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching volunteer',
                error: error.message
            });
        }
    }

    async updateVolunteerHours(req, res) {
        try {
            const { volunteerId } = req.params;
            const { hours } = req.body;
            
            if (!hours || hours <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid hours required'
                });
            }
            
            await VolunteerModel.updateVolunteerHours(volunteerId, parseFloat(hours));
            
            res.json({
                success: true,
                message: 'Volunteer hours updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating volunteer hours',
                error: error.message
            });
        }
    }

    async getTopVolunteers(req, res) {
        try {
            const { limit = 10 } = req.query;
            const volunteers = await VolunteerModel.getTopVolunteers(parseInt(limit));
            
            res.json({
                success: true,
                data: volunteers
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching top volunteers',
                error: error.message
            });
        }
    }

    async updateVolunteer(req, res) {
        try {
            const volunteerId = req.params.id;
            const { Skills, V_Availability, Experience_Level } = req.body;
            
            const volunteer = await VolunteerModel.findById(volunteerId);
            if (!volunteer) {
                return res.status(404).json({
                    success: false,
                    message: 'Volunteer not found'
                });
            }
            
            const updateData = {};
            if (Skills !== undefined) updateData.Skills = Skills;
            if (V_Availability !== undefined) updateData.V_Availability = V_Availability;
            if (Experience_Level !== undefined) updateData.Experience_Level = Experience_Level;
            
            const updated = await VolunteerModel.update(volunteerId, updateData);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Volunteer updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update volunteer'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating volunteer',
                error: error.message
            });
        }
    }
}

module.exports = new VolunteerController();