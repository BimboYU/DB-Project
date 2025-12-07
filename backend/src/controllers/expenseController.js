const ExpenseModel = require('../models/ExpenseModel');
const CampaignModel = require('../models/CampaignModel');
const JobsModel = require('../models/JobsModel');

class ExpenseController {
    async createExpense(req, res) {
        try {
            const { 
                E_Description, Amount, Campaign_ID, 
                E_Category, Approved_By 
            } = req.body;
            
            // Validation
            if (!E_Description || !Amount || !E_Category) {
                return res.status(400).json({
                    success: false,
                    message: 'Description, Amount, and Category are required'
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
            
            // Verify approver exists if provided
            if (Approved_By) {
                const approver = await JobsModel.findById(Approved_By);
                if (!approver) {
                    return res.status(404).json({
                        success: false,
                        message: 'Approver not found'
                    });
                }
            }
            
            const expenseData = {
                E_Description,
                Amount: amountNum,
                Campaign_ID: Campaign_ID || null,
                E_Category,
                Approved_By: Approved_By || null
            };
            
            const expenseId = await ExpenseModel.createExpense(expenseData);
            
            res.status(201).json({
                success: true,
                message: 'Expense recorded successfully',
                data: { expenseId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error recording expense',
                error: error.message
            });
        }
    }

    async getAllExpenses(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50, 
                campaignId, 
                category,
                startDate,
                endDate
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            let expenses;
            let total;
            
            if (campaignId) {
                expenses = await ExpenseModel.getExpensesByCampaign(campaignId);
                total = expenses.length;
            } else if (category && startDate && endDate) {
                expenses = await ExpenseModel.getExpensesByCategory(category, startDate, endDate);
                total = expenses.length;
            } else {
                expenses = await ExpenseModel.findAll({}, limit, offset);
                total = await ExpenseModel.count();
            }
            
            res.json({
                success: true,
                data: expenses,
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
                message: 'Error fetching expenses',
                error: error.message
            });
        }
    }

    async getExpenseById(req, res) {
        try {
            const expense = await ExpenseModel.findById(req.params.id);
            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense not found'
                });
            }
            
            res.json({
                success: true,
                data: expense
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching expense',
                error: error.message
            });
        }
    }

    async getExpenseSummary(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            // Default to last month if no dates provided
            const defaultEndDate = new Date();
            const defaultStartDate = new Date();
            defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
            
            const summary = await ExpenseModel.getExpenseSummary(
                startDate || defaultStartDate,
                endDate || defaultEndDate
            );
            
            const totals = await ExpenseModel.getTotalExpensesByPeriod(
                startDate || defaultStartDate,
                endDate || defaultEndDate
            );
            
            res.json({
                success: true,
                data: {
                    summary,
                    totals
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching expense summary',
                error: error.message
            });
        }
    }

    async updateExpense(req, res) {
        try {
            const expenseId = req.params.id;
            const { 
                E_Description, Amount, Campaign_ID, 
                E_Category, Approved_By 
            } = req.body;
            
            const expense = await ExpenseModel.findById(expenseId);
            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: 'Expense not found'
                });
            }
            
            const updateData = {};
            if (E_Description !== undefined) updateData.E_Description = E_Description;
            if (Amount !== undefined) updateData.Amount = parseFloat(Amount);
            if (Campaign_ID !== undefined) updateData.Campaign_ID = Campaign_ID;
            if (E_Category !== undefined) updateData.E_Category = E_Category;
            if (Approved_By !== undefined) updateData.Approved_By = Approved_By;
            
            const updated = await ExpenseModel.update(expenseId, updateData);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Expense updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update expense'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating expense',
                error: error.message
            });
        }
    }

    async deleteExpense(req, res) {
        try {
            const expenseId = req.params.id;
            const deleted = await ExpenseModel.delete(expenseId);
            
            if (deleted) {
                res.json({
                    success: true,
                    message: 'Expense deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Expense not found'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting expense',
                error: error.message
            });
        }
    }
}

module.exports = new ExpenseController();