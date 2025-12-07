const BeneficiaryModel = require('../models/BeneficiaryModel');
const PersonModel = require('../models/PersonModel');

class BeneficiaryController {
    async registerBeneficiary(req, res) {
        try {
            const { 
                Name, Email, Contact_No, Address, Age,
                Assistance_Type, Income_Level, Criminal_History, Dependents 
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
            
            // Create beneficiary record
            const beneficiaryData = {
                Assistance_Type: Assistance_Type || null,
                Income_Level: Income_Level || null,
                Criminal_History: Criminal_History || null,
                Dependents: Dependents ? parseInt(Dependents) : 0
            };
            
            const beneficiaryId = await BeneficiaryModel.createBeneficiary(personId, beneficiaryData);
            
            res.status(201).json({
                success: true,
                message: 'Beneficiary registered successfully',
                data: { beneficiaryId, personId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error registering beneficiary',
                error: error.message
            });
        }
    }

    async getAllBeneficiaries(req, res) {
        try {
            const { 
                page = 1, 
                limit = 100, 
                assistanceType, 
                incomeLevel 
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            let beneficiaries;
            let total;
            
            if (assistanceType) {
                beneficiaries = await BeneficiaryModel.getBeneficiariesByAssistanceType(assistanceType);
                total = beneficiaries.length;
            } else if (incomeLevel) {
                beneficiaries = await BeneficiaryModel.getBeneficiariesByIncomeLevel(incomeLevel);
                total = beneficiaries.length;
            } else {
                beneficiaries = await BeneficiaryModel.findAll({}, limit, offset);
                total = await BeneficiaryModel.count();
            }
            
            // Get person details for each beneficiary
            const beneficiariesWithDetails = await Promise.all(
                beneficiaries.map(async (beneficiary) => {
                    const person = await PersonModel.findById(beneficiary.PERSON_ID);
                    return { 
                        beneficiaryId: beneficiary.BENEFICIARY_ID,
                        personId: beneficiary.PERSON_ID,
                        ...beneficiary,
                        ...person 
                    };
                })
            );
            
            res.json({
                success: true,
                data: beneficiariesWithDetails,
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
                message: 'Error fetching beneficiaries',
                error: error.message
            });
        }
    }

    async getBeneficiaryById(req, res) {
        try {
            const beneficiary = await BeneficiaryModel.getBeneficiaryWithDetails(req.params.id);
            if (!beneficiary) {
                return res.status(404).json({
                    success: false,
                    message: 'Beneficiary not found'
                });
            }
            
            res.json({
                success: true,
                data: beneficiary
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching beneficiary',
                error: error.message
            });
        }
    }

    async updateBeneficiary(req, res) {
        try {
            const beneficiaryId = req.params.id;
            const { 
                Assistance_Type, Income_Level, 
                Criminal_History, Dependents 
            } = req.body;
            
            const beneficiary = await BeneficiaryModel.findById(beneficiaryId);
            if (!beneficiary) {
                return res.status(404).json({
                    success: false,
                    message: 'Beneficiary not found'
                });
            }
            
            const updateData = {};
            if (Assistance_Type !== undefined) updateData.Assistance_Type = Assistance_Type;
            if (Income_Level !== undefined) updateData.Income_Level = Income_Level;
            if (Criminal_History !== undefined) updateData.Criminal_History = Criminal_History;
            if (Dependents !== undefined) updateData.Dependents = parseInt(Dependents);
            
            const updated = await BeneficiaryModel.update(beneficiaryId, updateData);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Beneficiary updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update beneficiary'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating beneficiary',
                error: error.message
            });
        }
    }

    async recordAssistance(req, res) {
        try {
            const { beneficiaryId } = req.params;
            const { amount } = req.body;
            
            if (!amount || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid amount required'
                });
            }
            
            const beneficiary = await BeneficiaryModel.findById(beneficiaryId);
            if (!beneficiary) {
                return res.status(404).json({
                    success: false,
                    message: 'Beneficiary not found'
                });
            }
            
            await BeneficiaryModel.updateAmountReceived(beneficiaryId, parseFloat(amount));
            
            res.json({
                success: true,
                message: 'Assistance recorded successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error recording assistance',
                error: error.message
            });
        }
    }

    async updateDependents(req, res) {
        try {
            const { beneficiaryId } = req.params;
            const { dependents } = req.body;
            
            if (dependents === undefined || dependents < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid dependents count required'
                });
            }
            
            await BeneficiaryModel.updateBeneficiaryDependents(beneficiaryId, parseInt(dependents));
            
            res.json({
                success: true,
                message: 'Dependents updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating dependents',
                error: error.message
            });
        }
    }
}

module.exports = new BeneficiaryController();