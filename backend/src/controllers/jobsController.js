const JobsModel = require('../models/JobsModel');
const PersonModel = require('../models/PersonModel');

class JobsController {
    async hireStaff(req, res) {
        try {
            const { 
                Name, Email, Contact_No, Address, Age,
                Salary, Job_Title, Job_Description, Start_Date 
            } = req.body;
            
            // Validation
            if (!Name || !Email || !Job_Title) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, Email, and Job Title are required'
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
            
            // Create job record
            const jobData = {
                Salary: Salary ? parseFloat(Salary) : null,
                Job_Title,
                Job_Description: Job_Description || null,
                Start_Date: Start_Date || new Date(),
                End_Date: null
            };
            
            const jobId = await JobsModel.createJob(personId, jobData);
            
            res.status(201).json({
                success: true,
                message: 'Staff hired successfully',
                data: { jobId, personId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error hiring staff',
                error: error.message
            });
        }
    }

    async getAllStaff(req, res) {
        try {
            const { page = 1, limit = 100, activeOnly = 'true', jobTitle } = req.query;
            const offset = (page - 1) * limit;
            
            let staff;
            let total;
            
            if (activeOnly === 'true') {
                staff = await JobsModel.getActiveStaff();
                total = staff.length;
            } else if (jobTitle) {
                staff = await JobsModel.getStaffByTitle(jobTitle);
                total = staff.length;
            } else {
                staff = await JobsModel.findAll({}, limit, offset);
                total = await JobsModel.count();
            }
            
            res.json({
                success: true,
                data: staff,
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
                message: 'Error fetching staff',
                error: error.message
            });
        }
    }

    async getStaffById(req, res) {
        try {
            const job = await JobsModel.getJobWithDetails(req.params.id);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Staff member not found'
                });
            }
            
            res.json({
                success: true,
                data: job
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching staff member',
                error: error.message
            });
        }
    }

    async terminateStaff(req, res) {
        try {
            const { jobId } = req.params;
            const { endDate, reason } = req.body;
            
            const job = await JobsModel.findById(jobId);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }
            
            await JobsModel.terminateJob(jobId, endDate || new Date());
            
            res.json({
                success: true,
                message: 'Staff terminated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error terminating staff',
                error: error.message
            });
        }
    }

    async updateSalary(req, res) {
        try {
            const { jobId } = req.params;
            const { newSalary } = req.body;
            
            if (!newSalary || newSalary <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid salary required'
                });
            }
            
            const job = await JobsModel.findById(jobId);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }
            
            await JobsModel.updateSalary(jobId, parseFloat(newSalary));
            
            res.json({
                success: true,
                message: 'Salary updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating salary',
                error: error.message
            });
        }
    }

    async updateJob(req, res) {
        try {
            const jobId = req.params.id;
            const { 
                Job_Title, Job_Description, Salary, End_Date 
            } = req.body;
            
            const job = await JobsModel.findById(jobId);
            if (!job) {
                return res.status(404).json({
                    success: false,
                    message: 'Job not found'
                });
            }
            
            const updateData = {};
            if (Job_Title !== undefined) updateData.Job_Title = Job_Title;
            if (Job_Description !== undefined) updateData.Job_Description = Job_Description;
            if (Salary !== undefined) updateData.Salary = parseFloat(Salary);
            if (End_Date !== undefined) updateData.End_Date = End_Date;
            
            const updated = await JobsModel.update(jobId, updateData);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Job updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update job'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating job',
                error: error.message
            });
        }
    }
}

module.exports = new JobsController();