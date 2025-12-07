const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Import all controllers
const authController = require('../controllers/authController');
const personController = require('../controllers/personController');
const donationController = require('../controllers/donationController');
const campaignController = require('../controllers/campaignController');
const volunteerController = require('../controllers/volunteerController');
const internController = require('../controllers/internController');
const jobsController = require('../controllers/jobsController');
const beneficiaryController = require('../controllers/beneficiaryController');
const expenseController = require('../controllers/expenseController');
const inKindController = require('../controllers/inKindController');
const dashboardController = require('../controllers/dashboardController');
const reportController = require('../controllers/reportController');
const auditController = require('../controllers/auditController');
const roleController = require('../controllers/roleController');

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/register', authController.register);
router.get('/auth/profile', authMiddleware(), authController.getProfile);
router.post('/auth/change-password', authMiddleware(), authController.changePassword);

// Person routes
router.get('/persons', authMiddleware(['Admin', 'Staff']), personController.getAllPersons);
router.get('/persons/:id', authMiddleware(['Admin', 'Staff']), personController.getPersonById);
router.post('/persons', authMiddleware(['Admin', 'Staff']), personController.createPerson);
router.put('/persons/:id', authMiddleware(['Admin', 'Staff']), personController.updatePerson);
router.delete('/persons/:id', authMiddleware(['Admin']), personController.deletePerson);

// Donation routes
router.post('/donations/monetary', authMiddleware(['Admin', 'Staff', 'Donor']), donationController.createMonetaryDonation);
router.post('/donations/in-kind', authMiddleware(['Admin', 'Staff', 'Donor']), inKindController.createInKindDonation);
router.get('/donations', authMiddleware(['Admin', 'Staff']), donationController.getDonations);
router.get('/donations/in-kind', authMiddleware(['Admin', 'Staff']), inKindController.getInKindDonations);
router.get('/donations/summary', authMiddleware(['Admin', 'Staff']), donationController.getDonationSummary);
router.get('/donations/:id', authMiddleware(['Admin', 'Staff']), donationController.getDonationById);
router.get('/donations/in-kind/:id', authMiddleware(['Admin', 'Staff']), inKindController.getInKindDonationById);
router.get('/donations/in-kind/summary', authMiddleware(['Admin', 'Staff']), inKindController.getInKindSummary);
router.get('/donations/in-kind/category/:category', authMiddleware(['Admin', 'Staff']), inKindController.getDonationsByCategory);

// Campaign routes
router.get('/campaigns', campaignController.getAllCampaigns);
router.get('/campaigns/active', campaignController.getAllCampaigns); // with query param
router.get('/campaigns/:id', campaignController.getCampaignById);
router.get('/campaigns/:id/progress', campaignController.getCampaignProgress);
router.post('/campaigns', authMiddleware(['Admin', 'Manager']), campaignController.createCampaign);
router.put('/campaigns/:id', authMiddleware(['Admin', 'Manager']), campaignController.updateCampaign);
router.put('/campaigns/:id/status', authMiddleware(['Admin', 'Manager']), campaignController.updateCampaignStatus);
router.delete('/campaigns/:id', authMiddleware(['Admin']), campaignController.deleteCampaign);

// Volunteer routes
router.post('/volunteers/register', volunteerController.registerVolunteer);
router.get('/volunteers', authMiddleware(['Admin', 'Staff']), volunteerController.getAllVolunteers);
router.get('/volunteers/top', authMiddleware(['Admin', 'Staff']), volunteerController.getTopVolunteers);
router.get('/volunteers/:id', authMiddleware(['Admin', 'Staff']), volunteerController.getVolunteerById);
router.put('/volunteers/:id', authMiddleware(['Admin', 'Staff']), volunteerController.updateVolunteer);
router.put('/volunteers/:id/hours', authMiddleware(['Admin', 'Staff']), volunteerController.updateVolunteerHours);

// Intern routes
router.post('/interns/register', authMiddleware(['Admin', 'Staff']), internController.registerIntern);
router.get('/interns', authMiddleware(['Admin', 'Staff']), internController.getAllInterns);
router.get('/interns/active', internController.getAllInterns); // with query param
router.get('/interns/:id', authMiddleware(['Admin', 'Staff']), internController.getInternById);
router.put('/interns/:id', authMiddleware(['Admin', 'Staff']), internController.updateIntern);
router.put('/interns/:id/hours', authMiddleware(['Admin', 'Staff']), internController.updateInternHours);
router.put('/interns/:id/terminate', authMiddleware(['Admin', 'Staff']), internController.terminateIntern);

// Jobs/Staff routes
router.post('/jobs/hire', authMiddleware(['Admin']), jobsController.hireStaff);
router.get('/jobs/staff', authMiddleware(['Admin', 'Staff']), jobsController.getAllStaff);
router.get('/jobs/staff/active', jobsController.getAllStaff); // with query param
router.get('/jobs/staff/:id', authMiddleware(['Admin', 'Staff']), jobsController.getStaffById);
router.put('/jobs/staff/:id', authMiddleware(['Admin']), jobsController.updateJob);
router.put('/jobs/staff/:id/salary', authMiddleware(['Admin']), jobsController.updateSalary);
router.put('/jobs/staff/:id/terminate', authMiddleware(['Admin']), jobsController.terminateStaff);

// Beneficiary routes
router.post('/beneficiaries/register', authMiddleware(['Admin', 'Staff']), beneficiaryController.registerBeneficiary);
router.get('/beneficiaries', authMiddleware(['Admin', 'Staff']), beneficiaryController.getAllBeneficiaries);
router.get('/beneficiaries/:id', authMiddleware(['Admin', 'Staff']), beneficiaryController.getBeneficiaryById);
router.put('/beneficiaries/:id', authMiddleware(['Admin', 'Staff']), beneficiaryController.updateBeneficiary);
router.put('/beneficiaries/:id/assistance', authMiddleware(['Admin', 'Staff']), beneficiaryController.recordAssistance);
router.put('/beneficiaries/:id/dependents', authMiddleware(['Admin', 'Staff']), beneficiaryController.updateDependents);

// Expense routes
router.post('/expenses', authMiddleware(['Admin', 'Staff']), expenseController.createExpense);
router.get('/expenses', authMiddleware(['Admin', 'Staff']), expenseController.getAllExpenses);
router.get('/expenses/summary', authMiddleware(['Admin', 'Staff']), expenseController.getExpenseSummary);
router.get('/expenses/:id', authMiddleware(['Admin', 'Staff']), expenseController.getExpenseById);
router.put('/expenses/:id', authMiddleware(['Admin', 'Staff']), expenseController.updateExpense);
router.delete('/expenses/:id', authMiddleware(['Admin']), expenseController.deleteExpense);

// Role routes
router.get('/roles', authMiddleware(['Admin']), roleController.getAllRoles);
router.post('/roles', authMiddleware(['Admin']), roleController.createRole);
router.post('/roles/assign', authMiddleware(['Admin']), roleController.assignRole);
router.post('/roles/remove', authMiddleware(['Admin']), roleController.removeRole);
router.get('/roles/user/:userId', authMiddleware(['Admin']), roleController.getUserRoles);

// Dashboard routes
router.get('/dashboard/admin', authMiddleware(['Admin']), dashboardController.getAdminDashboard);
router.get('/dashboard/campaign', authMiddleware(['Admin', 'Manager']), dashboardController.getCampaignDashboard);
router.get('/dashboard/volunteer', authMiddleware(['Admin', 'Staff']), dashboardController.getVolunteerDashboard);
router.get('/dashboard/financial', authMiddleware(['Admin', 'Manager']), dashboardController.getFinancialDashboard);
router.get('/dashboard/donor', authMiddleware(['Admin', 'Staff']), dashboardController.getDonorDashboard);

// Report routes
router.get('/reports/financial', authMiddleware(['Admin', 'Manager']), reportController.generateFinancialReport);
router.get('/reports/donor', authMiddleware(['Admin', 'Staff']), reportController.generateDonorReport);
router.get('/reports/campaign/:campaignId', authMiddleware(['Admin', 'Manager']), reportController.generateCampaignReport);
router.get('/reports/monthly', authMiddleware(['Admin', 'Manager']), reportController.generateMonthlyReport);
router.get('/reports/download/:filename', authMiddleware(['Admin', 'Staff']), reportController.downloadReport);

// Audit routes
router.get('/audit/logs', authMiddleware(['Admin']), auditController.getAuditLogs);
router.get('/audit/recent', authMiddleware(['Admin']), auditController.getRecentActivities);
router.get('/audit/record/:tableName/:recordId', authMiddleware(['Admin']), auditController.getAuditLogsByRecord);
router.get('/audit/export', authMiddleware(['Admin']), auditController.exportAuditLogs);

module.exports = router;