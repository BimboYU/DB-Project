const DonationModel = require('../models/DonationModel');
const DonorModel = require('../models/DonorModel');
const CampaignModel = require('../models/CampaignModel');

class DonationController {
    async createMonetaryDonation(req, res) {
        try {
            const { 
                Donor_ID, Amount, Payment_Method, 
                Transaction_ID, Campaign_ID 
            } = req.body;
            
            // Validation
            if (!Donor_ID || !Amount || !Payment_Method) {
                return res.status(400).json({
                    success: false,
                    message: 'Donor ID, Amount, and Payment Method are required'
                });
            }
            
            // Validate amount
            const amountNum = parseFloat(Amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid amount is required'
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
            
            // Verify campaign exists if provided
            if (Campaign_ID) {
                const campaign = await CampaignModel.findById(Campaign_ID);
                if (!campaign) {
                    return res.status(404).json({
                        success: false,
                        message: 'Campaign not found'
                    });
                }
            }
            
            const donationData = {
                Donor_ID,
                Amount: amountNum,
                Payment_Method,
                Transaction_ID: Transaction_ID || null,
                Campaign_ID: Campaign_ID || null
            };
            
            const donationId = await DonationModel.createMonetaryDonation(donationData);
            
            res.status(201).json({
                success: true,
                message: 'Donation recorded successfully',
                data: { donationId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error recording donation',
                error: error.message
            });
        }
    }

    async getDonations(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50, 
                donorId, 
                campaignId,
                startDate,
                endDate
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            let donations;
            let total;
            
            if (donorId) {
                // Get donations by donor
                donations = await DonationModel.findAll({ DONOR_ID: donorId }, limit, offset);
                total = await DonationModel.count({ DONOR_ID: donorId });
            } else if (campaignId) {
                // Get donations by campaign
                donations = await DonationModel.getDonationsByCampaign(campaignId);
                total = donations.length;
            } else {
                donations = await DonationModel.findAll({}, limit, offset);
                total = await DonationModel.count();
            }
            
            // Filter by date if provided
            if (startDate && endDate) {
                donations = donations.filter(donation => {
                    const donationDate = new Date(donation.DONATION_DATE);
                    return donationDate >= new Date(startDate) && donationDate <= new Date(endDate);
                });
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
                message: 'Error fetching donations',
                error: error.message
            });
        }
    }

    async getDonationById(req, res) {
        try {
            const donation = await DonationModel.getDonationWithDetails(req.params.id);
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

    async getDonationSummary(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            // Default to last month if no dates provided
            const defaultEndDate = new Date();
            const defaultStartDate = new Date();
            defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
            
            const summary = await DonationModel.getDonationSummary(
                startDate || defaultStartDate,
                endDate || defaultEndDate
            );
            
            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching donation summary',
                error: error.message
            });
        }
    }
}

module.exports = new DonationController();