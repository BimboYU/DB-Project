const PersonModel = require('../models/PersonModel');

class PersonController {
    async getAllPersons(req, res) {
        try {
            const { page = 1, limit = 100, search } = req.query;
            const offset = (page - 1) * limit;
            
            let persons;
            let total;
            
            if (search) {
                persons = await PersonModel.searchPersons(search);
                total = persons.length;
            } else {
                persons = await PersonModel.findAll({}, limit, offset);
                total = await PersonModel.count();
            }
            
            res.json({
                success: true,
                data: persons,
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
                message: 'Error fetching persons',
                error: error.message
            });
        }
    }

    async getPersonById(req, res) {
        try {
            const person = await PersonModel.findById(req.params.id);
            if (!person) {
                return res.status(404).json({
                    success: false,
                    message: 'Person not found'
                });
            }
            
            res.json({
                success: true,
                data: person
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching person',
                error: error.message
            });
        }
    }

    async createPerson(req, res) {
        try {
            const { Name, Age, Contact_No, Email, Address } = req.body;
            
            // Validation
            if (!Name || !Email) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and Email are required'
                });
            }
            
            // Check if email already exists
            const existingPerson = await PersonModel.findByEmail(Email);
            if (existingPerson) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            const personData = {
                Name,
                Age: Age ? parseInt(Age) : null,
                Contact_No: Contact_No || null,
                Email,
                Address: Address || null
            };
            
            const personId = await PersonModel.createPerson(personData);
            
            res.status(201).json({
                success: true,
                message: 'Person created successfully',
                data: { personId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating person',
                error: error.message
            });
        }
    }

    async updatePerson(req, res) {
        try {
            const personId = req.params.id;
            const { Name, Age, Contact_No, Email, Address } = req.body;
            
            const person = await PersonModel.findById(personId);
            if (!person) {
                return res.status(404).json({
                    success: false,
                    message: 'Person not found'
                });
            }
            
            // Check if email is being changed and already exists
            if (Email && Email !== person.EMAIL) {
                const existingPerson = await PersonModel.findByEmail(Email);
                if (existingPerson && existingPerson.PERSON_ID !== parseInt(personId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email already exists'
                    });
                }
            }
            
            const updateData = {};
            if (Name !== undefined) updateData.Name = Name;
            if (Age !== undefined) updateData.Age = Age ? parseInt(Age) : null;
            if (Contact_No !== undefined) updateData.Contact_No = Contact_No;
            if (Email !== undefined) updateData.Email = Email;
            if (Address !== undefined) updateData.Address = Address;
            
            const updated = await PersonModel.updatePerson(personId, updateData);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Person updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update person'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating person',
                error: error.message
            });
        }
    }

    async deletePerson(req, res) {
        try {
            const personId = req.params.id;
            const deleted = await PersonModel.delete(personId);
            
            if (deleted) {
                res.json({
                    success: true,
                    message: 'Person deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Person not found'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting person',
                error: error.message
            });
        }
    }
}

module.exports = new PersonController();