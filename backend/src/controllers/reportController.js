const db = require('../config/database');
const fs = require('fs');
const path = require('path');

class ReportController {
    async generateFinancialReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
            }
            
            // Donation summary
            const donationSql = `
                SELECT 
                    TO_CHAR(d.Donation_Date, 'YYYY-MM') AS Month,
                    COUNT(*) AS Total_Donations,
                    SUM(CASE WHEN md.Donation_ID IS NOT NULL THEN md.Amount ELSE 0 END) AS Monetary_Total,
                    SUM(CASE WHEN ikd.Donation_ID IS NOT NULL THEN ikd.Estimated_Value ELSE 0 END) AS InKind_Value,
                    COUNT(DISTINCT d.Donor_ID) AS Unique_Donors
                FROM Donations d
                LEFT JOIN Monetary_Donation md ON d.Donation_ID = md.Donation_ID
                LEFT JOIN In_Kind_Donation ikd ON d.Donation_ID = ikd.Donation_ID
                WHERE d.Donation_Date BETWEEN :startDate AND :endDate
                GROUP BY TO_CHAR(d.Donation_Date, 'YYYY-MM')
                ORDER BY Month
            `;
            
            // Expense summary
            const expenseSql = `
                SELECT 
                    TO_CHAR(e.Expense_Date, 'YYYY-MM') AS Month,
                    COUNT(*) AS Total_Expenses,
                    SUM(e.Amount) AS Expense_Total,
                    e.E_Category
                FROM Expense e
                WHERE e.Expense_Date BETWEEN :startDate AND :endDate
                GROUP BY TO_CHAR(e.Expense_Date, 'YYYY-MM'), e.E_Category
                ORDER BY Month, e.E_Category
            `;
            
            // Campaign performance
            const campaignSql = `
                SELECT 
                    c.Campaign_Name,
                    c.Campaign_Type,
                    c.Start_Date,
                    c.End_Date,
                    c.Goal_Amount,
                    c.Current_Amount,
                    ROUND((c.Current_Amount / c.Goal_Amount) * 100, 2) AS Progress_Percentage,
                    (SELECT COUNT(*) FROM Donations WHERE Campaign_ID = c.Campaign_ID 
                     AND Donation_Date BETWEEN :startDate AND :endDate) AS Donations_Count
                FROM Campaign c
                WHERE (c.Start_Date <= :endDate AND (c.End_Date IS NULL OR c.End_Date >= :startDate))
                ORDER BY c.Campaign_Name
            `;
            
            // Top donors
            const topDonorsSql = `
                SELECT 
                    p.Name AS Donor_Name,
                    d.Number_Of_Times_Donated,
                    d.Last_Donation_Date,
                    (SELECT SUM(md.Amount) FROM Monetary_Donation md 
                     JOIN Donations don ON md.Donation_ID = don.Donation_ID 
                     WHERE don.Donor_ID = d.Donor_ID 
                     AND don.Donation_Date BETWEEN :startDate AND :endDate) AS Monetary_Total,
                    (SELECT COUNT(*) FROM Donations 
                     WHERE Donor_ID = d.Donor_ID 
                     AND Donation_Date BETWEEN :startDate AND :endDate) AS Donations_Count
                FROM Donor d
                JOIN Person p ON d.Person_ID = p.Person_ID
                WHERE EXISTS (SELECT 1 FROM Donations 
                              WHERE Donor_ID = d.Donor_ID 
                              AND Donation_Date BETWEEN :startDate AND :endDate)
                ORDER BY Monetary_Total DESC NULLS LAST
                FETCH FIRST 20 ROWS ONLY
            `;
            
            const donations = await db.executeQuery(donationSql, [startDate, endDate]);
            const expenses = await db.executeQuery(expenseSql, [startDate, endDate]);
            const campaigns = await db.executeQuery(campaignSql, [startDate, endDate, startDate, endDate]);
            const topDonors = await db.executeQuery(topDonorsSql, [startDate, endDate]);
            
            // Calculate totals
            const totals = {
                totalDonations: donations.rows.reduce((sum, row) => sum + row.MONETARY_TOTAL, 0),
                totalInKind: donations.rows.reduce((sum, row) => sum + row.INKIND_VALUE, 0),
                totalExpenses: expenses.rows.reduce((sum, row) => sum + row.EXPENSE_TOTAL, 0),
                netRevenue: 0
            };
            totals.netRevenue = totals.totalDonations + totals.totalInKind - totals.totalExpenses;
            
            const report = {
                period: { startDate, endDate },
                generatedDate: new Date().toISOString(),
                summary: {
                    totals,
                    donationSummary: donations.rows,
                    expenseSummary: expenses.rows,
                    campaignPerformance: campaigns.rows,
                    topDonors: topDonors.rows
                }
            };
            
            // Save report to file (optional)
            const reportDir = path.join(__dirname, '../../reports');
            if (!fs.existsSync(reportDir)) {
                fs.mkdirSync(reportDir, { recursive: true });
            }
            
            const filename = `financial_report_${new Date().toISOString().split('T')[0]}.json`;
            const filepath = path.join(reportDir, filename);
            fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
            
            res.json({
                success: true,
                message: 'Financial report generated successfully',
                data: report,
                downloadUrl: `/api/reports/download/${filename}`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error generating financial report',
                error: error.message
            });
        }
    }

    async generateDonorReport(req, res) {
        try {
            const { donorId, startDate, endDate } = req.query;
            
            if (!donorId) {
                return res.status(400).json({
                    success: false,
                    message: 'Donor ID is required'
                });
            }
            
            // Donor information
            const donorSql = `
                SELECT d.*, p.Name, p.Email, p.Contact_No, p.Address
                FROM Donor d
                JOIN Person p ON d.Person_ID = p.Person_ID
                WHERE d.Donor_ID = :donorId
            `;
            
            // Donation history
            const donationHistorySql = `
                SELECT 
                    d.Donation_ID,
                    d.Donation_Date,
                    d.Campaign_ID,
                    c.Campaign_Name,
                    CASE 
                        WHEN md.Donation_ID IS NOT NULL THEN 'Monetary'
                        WHEN ikd.Donation_ID IS NOT NULL THEN 'In-Kind'
                    END AS Donation_Type,
                    md.Amount AS Monetary_Amount,
                    md.Payment_Method,
                    ikd.I_Description AS InKind_Description,
                    ikd.Quantity AS InKind_Quantity,
                    ikd.Estimated_Value AS InKind_Value,
                    ikd.I_Category
                FROM Donations d
                LEFT JOIN Campaign c ON d.Campaign_ID = c.Campaign_ID
                LEFT JOIN Monetary_Donation md ON d.Donation_ID = md.Donation_ID
                LEFT JOIN In_Kind_Donation ikd ON d.Donation_ID = ikd.Donation_ID
                WHERE d.Donor_ID = :donorId
                ${startDate && endDate ? 'AND d.Donation_Date BETWEEN :startDate AND :endDate' : ''}
                ORDER BY d.Donation_Date DESC
            `;
            
            const binds = [donorId];
            if (startDate && endDate) {
                binds.push(startDate, endDate);
            }
            
            const donor = await db.executeQuery(donorSql, [donorId]);
            const donations = await db.executeQuery(donationHistorySql, binds);
            
            if (!donor.rows[0]) {
                return res.status(404).json({
                    success: false,
                    message: 'Donor not found'
                });
            }
            
            // Calculate totals
            const totals = donations.rows.reduce((acc, donation) => {
                if (donation.DONATION_TYPE === 'Monetary') {
                    acc.totalMonetary += donation.MONETARY_AMOUNT || 0;
                    acc.monetaryCount++;
                } else {
                    acc.totalInKind += donation.INKIND_VALUE || 0;
                    acc.inKindCount++;
                }
                return acc;
            }, { totalMonetary: 0, totalInKind: 0, monetaryCount: 0, inKindCount: 0 });
            
            const report = {
                donor: donor.rows[0],
                period: startDate && endDate ? { startDate, endDate } : 'All Time',
                generatedDate: new Date().toISOString(),
                summary: {
                    totals,
                    donations: donations.rows
                }
            };
            
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error generating donor report',
                error: error.message
            });
        }
    }

    async generateCampaignReport(req, res) {
        try {
            const { campaignId } = req.params;
            
            // Campaign details
            const campaignSql = `
                SELECT c.*, p.Name AS Manager_Name, p.Email AS Manager_Email
                FROM Campaign c
                LEFT JOIN Jobs j ON c.Manager_ID = j.Job_ID
                LEFT JOIN Person p ON j.Person_ID = p.Person_ID
                WHERE c.Campaign_ID = :campaignId
            `;
            
            // Donations for campaign
            const donationsSql = `
                SELECT 
                    d.Donation_ID,
                    d.Donation_Date,
                    dr.Donor_ID,
                    p.Name AS Donor_Name,
                    p.Email AS Donor_Email,
                    CASE 
                        WHEN md.Donation_ID IS NOT NULL THEN 'Monetary'
                        WHEN ikd.Donation_ID IS NOT NULL THEN 'In-Kind'
                    END AS Donation_Type,
                    md.Amount AS Monetary_Amount,
                    md.Payment_Method,
                    ikd.I_Description AS InKind_Description,
                    ikd.Quantity AS InKind_Quantity,
                    ikd.Estimated_Value AS InKind_Value,
                    ikd.I_Category
                FROM Donations d
                JOIN Donor dr ON d.Donor_ID = dr.Donor_ID
                JOIN Person p ON dr.Person_ID = p.Person_ID
                LEFT JOIN Monetary_Donation md ON d.Donation_ID = md.Donation_ID
                LEFT JOIN In_Kind_Donation ikd ON d.Donation_ID = ikd.Donation_ID
                WHERE d.Campaign_ID = :campaignId
                ORDER BY d.Donation_Date DESC
            `;
            
            // Expenses for campaign
            const expensesSql = `
                SELECT e.*, p.Name AS Approver_Name
                FROM Expense e
                LEFT JOIN Jobs j ON e.Approved_By = j.Job_ID
                LEFT JOIN Person p ON j.Person_ID = p.Person_ID
                WHERE e.Campaign_ID = :campaignId
                ORDER BY e.Expense_Date DESC
            `;
            
            const campaign = await db.executeQuery(campaignSql, [campaignId]);
            const donations = await db.executeQuery(donationsSql, [campaignId]);
            const expenses = await db.executeQuery(expensesSql, [campaignId]);
            
            if (!campaign.rows[0]) {
                return res.status(404).json({
                    success: false,
                    message: 'Campaign not found'
                });
            }
            
            // Calculate totals
            const donationTotals = donations.rows.reduce((acc, donation) => {
                if (donation.DONATION_TYPE === 'Monetary') {
                    acc.totalMonetary += donation.MONETARY_AMOUNT || 0;
                    acc.monetaryCount++;
                } else {
                    acc.totalInKind += donation.INKIND_VALUE || 0;
                    acc.inKindCount++;
                }
                return acc;
            }, { totalMonetary: 0, totalInKind: 0, monetaryCount: 0, inKindCount: 0 });
            
            const expenseTotal = expenses.rows.reduce((sum, expense) => sum + expense.AMOUNT, 0);
            
            const report = {
                campaign: campaign.rows[0],
                generatedDate: new Date().toISOString(),
                financials: {
                    goalAmount: campaign.rows[0].GOAL_AMOUNT,
                    currentAmount: campaign.rows[0].CURRENT_AMOUNT,
                    progressPercentage: ((campaign.rows[0].CURRENT_AMOUNT / campaign.rows[0].GOAL_AMOUNT) * 100).toFixed(2),
                    donations: donationTotals,
                    expenses: {
                        total: expenseTotal,
                        count: expenses.rows.length,
                        details: expenses.rows
                    },
                    netAmount: campaign.rows[0].CURRENT_AMOUNT - expenseTotal
                },
                donations: donations.rows,
                expenses: expenses.rows
            };
            
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error generating campaign report',
                error: error.message
            });
        }
    }

    async generateMonthlyReport(req, res) {
        try {
            const { year, month } = req.query;
            
            if (!year || !month) {
                return res.status(400).json({
                    success: false,
                    message: 'Year and month are required'
                });
            }
            
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            
            // Monthly summary
            const monthlySql = `
                SELECT 
                    'Donations' AS Category,
                    COUNT(*) AS Count,
                    SUM(CASE WHEN md.Donation_ID IS NOT NULL THEN md.Amount ELSE 0 END) AS Monetary_Total,
                    SUM(CASE WHEN ikd.Donation_ID IS NOT NULL THEN ikd.Estimated_Value ELSE 0 END) AS InKind_Total
                FROM Donations d
                LEFT JOIN Monetary_Donation md ON d.Donation_ID = md.Donation_ID
                LEFT JOIN In_Kind_Donation ikd ON d.Donation_ID = ikd.Donation_ID
                WHERE d.Donation_Date BETWEEN :startDate AND :endDate
                UNION ALL
                SELECT 
                    'Expenses' AS Category,
                    COUNT(*) AS Count,
                    SUM(Amount) AS Monetary_Total,
                    0 AS InKind_Total
                FROM Expense
                WHERE Expense_Date BETWEEN :startDate AND :endDate
            `;
            
            // New registrations
            const registrationsSql = `
                SELECT 
                    'Donors' AS Type,
                    COUNT(*) AS Count
                FROM Donor d
                WHERE EXISTS (SELECT 1 FROM Person p WHERE p.Person_ID = d.Person_ID 
                              AND p.Created_Date BETWEEN :startDate AND :endDate)
                UNION ALL
                SELECT 
                    'Volunteers' AS Type,
                    COUNT(*) AS Count
                FROM Volunteer v
                WHERE v.Join_Date BETWEEN :startDate AND :endDate
                UNION ALL
                SELECT 
                    'Beneficiaries' AS Type,
                    COUNT(*) AS Count
                FROM Beneficiary b
                WHERE b.Registration_Date BETWEEN :startDate AND :endDate
            `;
            
            // Campaign updates
            const campaignsSql = `
                SELECT 
                    c.Campaign_Name,
                    c.Campaign_Type,
                    c.Status,
                    c.Goal_Amount,
                    c.Current_Amount,
                    (c.Current_Amount / c.Goal_Amount * 100) AS Progress
                FROM Campaign c
                WHERE (c.Start_Date <= :endDate AND (c.End_Date IS NULL OR c.End_Date >= :startDate))
                ORDER BY c.Status, c.Campaign_Name
            `;
            
            const monthly = await db.executeQuery(monthlySql, [startDate, endDate, startDate, endDate]);
            const registrations = await db.executeQuery(registrationsSql, [startDate, endDate, startDate, endDate, startDate, endDate]);
            const campaigns = await db.executeQuery(campaignsSql, [endDate, startDate]);
            
            const report = {
                period: { year, month, startDate, endDate },
                generatedDate: new Date().toISOString(),
                summary: {
                    financials: monthly.rows,
                    registrations: registrations.rows,
                    campaigns: campaigns.rows
                }
            };
            
            res.json({
                success: true,
                data: report
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error generating monthly report',
                error: error.message
            });
        }
    }

    async downloadReport(req, res) {
        try {
            const { filename } = req.params;
            const filepath = path.join(__dirname, '../../reports', filename);
            
            if (!fs.existsSync(filepath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Report file not found'
                });
            }
            
            res.download(filepath, filename);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error downloading report',
                error: error.message
            });
        }
    }
}

module.exports = new ReportController();