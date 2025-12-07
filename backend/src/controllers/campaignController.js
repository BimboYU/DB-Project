const CampaignModel = require('../models/CampaignModel');
const JobsModel = require('../models/JobsModel');

class CampaignController {
    async createCampaign(req, res) {
        try {
            const { 
                Campaign_Name, Campaign_Type, Start_Date, End_Date,
                Goal_Amount, Manager_ID 
            } = req.body;
            
            // Validation
            if (!Campaign_Name || !Campaign_Type || !Goal_Amount) {
                return res.status(400).json({
                    success: false,
                    message: 'Campaign Name, Type, and Goal Amount are required'
                });
            }
            
            // Validate goal amount
            const goalAmountNum = parseFloat(Goal_Amount);
            if (isNaN(goalAmountNum) || goalAmountNum <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid goal amount is required'
                });
            }
            
            // Verify manager exists if provided
            if (Manager_ID) {
                const manager = await JobsModel.findById(Manager_ID);
                if (!manager) {
                    return res.status(404).json({
                        success: false,
                        message: 'Manager not found'
                    });
                }
            }
            
            const campaignData = {
                Campaign_Name,
                Campaign_Type,
                Start_Date: Start_Date || new Date(),
                End_Date: End_Date || null,
                Goal_Amount: goalAmountNum,
                Manager_ID: Manager_ID || null
            };
            
            const campaignId = await CampaignModel.createCampaign(campaignData);
            
            res.status(201).json({
                success: true,
                message: 'Campaign created successfully',
                data: { campaignId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating campaign',
                error: error.message
            });
        }
    }

    async getAllCampaigns(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50, 
                status, 
                campaignType,
                activeOnly 
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            let campaigns;
            let total;
            
            if (activeOnly === 'true') {
                campaigns = await CampaignModel.getActiveCampaigns();
                total = campaigns.length;
            } else if (campaignType) {
                campaigns = await CampaignModel.getCampaignsByType(campaignType);
                total = campaigns.length;
            } else if (status) {
                campaigns = await CampaignModel.findAll({ Status: status }, limit, offset);
                total = await CampaignModel.count({ Status: status });
            } else {
                campaigns = await CampaignModel.findAll({}, limit, offset);
                total = await CampaignModel.count();
            }
            
            res.json({
                success: true,
                data: campaigns,
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
                message: 'Error fetching campaigns',
                error: error.message
            });
        }
    }

    async getCampaignById(req, res) {
        try {
            const campaign = await CampaignModel.getCampaignWithDetails(req.params.id);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }
            
            res.json({
                success: true,
                data: campaign
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching campaign',
                error: error.message
            });
        }
    }

    async updateCampaign(req, res) {
        try {
            const campaignId = req.params.id;
            const { 
                Campaign_Name, Campaign_Type, Start_Date, End_Date,
                Goal_Amount, Manager_ID, Status 
            } = req.body;
            
            const campaign = await CampaignModel.findById(campaignId);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }
            
            const updateData = {};
            if (Campaign_Name !== undefined) updateData.Campaign_Name = Campaign_Name;
            if (Campaign_Type !== undefined) updateData.Campaign_Type = Campaign_Type;
            if (Start_Date !== undefined) updateData.Start_Date = Start_Date;
            if (End_Date !== undefined) updateData.End_Date = End_Date;
            if (Goal_Amount !== undefined) updateData.Goal_Amount = parseFloat(Goal_Amount);
            if (Manager_ID !== undefined) updateData.Manager_ID = Manager_ID;
            if (Status !== undefined) updateData.Status = Status;
            
            const updated = await CampaignModel.update(campaignId, updateData);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Campaign updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update campaign'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating campaign',
                error: error.message
            });
        }
    }

    async updateCampaignStatus(req, res) {
        try {
            const { campaignId } = req.params;
            const { status } = req.body;
            
            if (!status || !['Active', 'Completed', 'Cancelled'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid status is required (Active, Completed, Cancelled)'
                });
            }
            
            const campaign = await CampaignModel.findById(campaignId);
            if (!campaign) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }
            
            await CampaignModel.updateCampaignStatus(campaignId, status);
            
            res.json({
                success: true,
                message: 'Campaign status updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating campaign status',
                error: error.message
            });
        }
    }

    async getCampaignProgress(req, res) {
        try {
            const { campaignId } = req.params;
            const progress = await CampaignModel.getCampaignProgress(campaignId);
            
            if (!progress) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }
            
            res.json({
                success: true,
                data: progress
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching campaign progress',
                error: error.message
            });
        }
    }

    async deleteCampaign(req, res) {
        try {
            const campaignId = req.params.id;
            const deleted = await CampaignModel.delete(campaignId);
            
            if (deleted) {
                res.json({
                    success: true,
                    message: 'Campaign deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting campaign',
                error: error.message
            });
        }
    }
}

module.exports = new CampaignController();