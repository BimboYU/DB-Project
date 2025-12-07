const InKindDonationModel = require('../models/InKindDonationModel');
const DonorModel = require('../models/DonorModel');

class InKindController {
    async createInKindDonation(req, res) {
        try {
            const { 
                Donor_ID, Campaign_ID, I_Description, 
                Quantity, Estimated_Value, I_Category, categoryData 
            } = req.body;
            
            // Validation
            if (!Donor_ID || !I_Description || !Quantity || !I_Category) {
                return res.status(400).json({
                    success: false,
                    message: 'Donor_ID, Description, Quantity, and Category are required'
                });
            }
            
            // Validate category data based on category
            const categoryValidation = this.validateCategoryData(I_Category, categoryData);
            if (!categoryValidation.valid) {
                return res.status(400).json({
                    success: false,
                    message: categoryValidation.message
                });
            }
            
            // Verify donor exists
            const donor = await DonorModel.findById(Donor_ID);
            if (!donor) {
                return res.status(404).json({
                    success: false,
                    message: 'Donor not found'
                });
            }
            
            const donationData = {
                Donor_ID,
                Campaign_ID: Campaign_ID || null,
                I_Description,
                Quantity: parseInt(Quantity),
                Estimated_Value: Estimated_Value ? parseFloat(Estimated_Value) : null,
                I_Category,
                categoryData
            };
            
            const donationId = await InKindDonationModel.createInKindDonation(donationData);
            
            res.status(201).json({
                success: true,
                message: 'In-kind donation recorded successfully',
                data: { Donation_ID: donationId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error recording in-kind donation',
                error: error.message
            });
        }
    }

    validateCategoryData(category, data) {
        if (!data) {
            return { valid: false, message: 'Category data is required' };
        }
        
        switch (category) {
            case 'Healthcare':
                if (!data.H_Type) {
                    return { valid: false, message: 'Healthcare type is required' };
                }
                break;
                
            case 'Clothes':
                if (!data.Age_Group || !data.Gender || !data.C_Condition) {
                    return { valid: false, message: 'Age group, gender, and condition are required for clothes' };
                }
                break;
                
            case 'Food':
                if (!data.F_Type) {
                    return { valid: false, message: 'Food type is required' };
                }
                break;
                
            case 'Electronics':
                if (!data.E_Type) {
                    return { valid: false, message: 'Electronics type is required' };
                }
                break;
                
            case 'Shoes':
                if (!data.Gender || !data.S_Condition) {
                    return { valid: false, message: 'Gender and condition are required for shoes' };
                }
                break;
                
            case 'Sanitary':
                if (!data.Product_Type || !data.Gender) {
                    return { valid: false, message: 'Product type and gender are required for sanitary items' };
                }
                break;
        }
        
        return { valid: true };
    }

    async getInKindDonations(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50, 
                category, 
                donorId,
                startDate,
                endDate
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            let donations;
            let total;
            
            if (category) {
                donations = await InKindDonationModel.getInKindDonationsByCategory(category);
                total = donations.length;
            } else {
                donations = await InKindDonationModel.findAll({}, limit, offset);
                total = await InKindDonationModel.count();
            }
            
            // Filter by date if provided
            if (startDate && endDate) {
                donations = donations.filter(donation => {
                    const donationDate = new Date(donation.DONATION_DATE);
                    return donationDate >= new Date(startDate) && donationDate <= new Date(endDate);
                });
            }
            
            // Filter by donor if provided
            if (donorId) {
                donations = donations.filter(donation => donation.DONOR_ID == donorId);
            }
            
            res.json({
                success: true,
                data: donations,
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
                message: 'Error fetching in-kind donations',
                error: error.message
            });
        }
    }

    async getInKindDonationById(req, res) {
        try {
            const donation = await InKindDonationModel.getInKindDonationDetails(req.params.id);
            if (!donation) {
                return res.status(404).json({
                    success: false,
                    message: 'Donation not found'
                });
            }
            
            res.json({
                success: true,
                data: donation
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching donation',
                error: error.message
            });
        }
    }

    async getInKindSummary(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            const sql = `
                SELECT 
                    I_Category,
                    COUNT(*) AS Total_Donations,
                    SUM(Quantity) AS Total_Quantity,
                    SUM(Estimated_Value) AS Total_Value
                FROM In_Kind_Donation ik
                JOIN Donations d ON ik.Donation_ID = d.Donation_ID
                WHERE d.Donation_Date BETWEEN :startDate AND :endDate
                GROUP BY I_Category
                ORDER BY Total_Value DESC
            `;
            
            const db = require('../config/database');
            const result = await db.executeQuery(sql, [startDate, endDate]);
            
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching in-kind summary',
                error: error.message
            });
        }
    }

    async getDonationsByCategory(req, res) {
        try {
            const { category } = req.params;
            const donations = await InKindDonationModel.getInKindDonationsByCategory(category);
            
            res.json({
                success: true,
                data: donations
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching donations by category',
                error: error.message
            });
        }
    }
}

module.exports = new InKindController();