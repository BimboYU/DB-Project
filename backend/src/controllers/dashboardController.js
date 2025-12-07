const db = require('../config/database');

class DashboardController {
    async getAdminDashboard(req, res) {
        try {
            const sql = 'SELECT * FROM Admin_Dashboard';
            const result = await db.executeQuery(sql);
            
            // Additional real-time metrics
            const metricsSql = `
                SELECT 
                    (SELECT COUNT(*) FROM Donations WHERE Donation_Date >= TRUNC(SYSDATE)) AS Today_Donations,
                    (SELECT SUM(md.Amount) FROM Monetary_Donation md 
                     JOIN Donations d ON md.Donation_ID = d.Donation_ID 
                     WHERE d.Donation_Date >= TRUNC(SYSDATE)) AS Today_Monetary,
                    (SELECT COUNT(*) FROM Expense WHERE Expense_Date >= TRUNC(SYSDATE)) AS Today_Expenses,
                    (SELECT COUNT(*) FROM Campaign WHERE Status = 'Active' AND End_Date IS NOT NULL 
                     AND End_Date <= SYSDATE + 7) AS Campaigns_Ending_Soon
                FROM DUAL
            `;
            
            const metrics = await db.executeQuery(metricsSql);
            
            res.json({
                success: true,
                data: {
                    ...result.rows[0],
                    todayMetrics: metrics.rows[0]
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching dashboard data',
                error: error.message
            });
        }
    }

    async getCampaignDashboard(req, res) {
        try {
            const sql = 'SELECT * FROM Campaign_Summary WHERE Status = :status';
            const result = await db.executeQuery(sql, ['Active']);
            
            // Campaign progress metrics
            const metricsSql = `
                SELECT 
                    (SELECT SUM(Current_Amount) FROM Campaign WHERE Status = 'Active') AS Total_Raised,
                    (SELECT SUM(Goal_Amount) FROM Campaign WHERE Status = 'Active') AS Total_Goal,
                    (SELECT COUNT(*) FROM Campaign WHERE Status = 'Active') AS Active_Campaigns,
                    (SELECT COUNT(*) FROM Campaign WHERE Status = 'Completed') AS Completed_Campaigns,
                    (SELECT ROUND(AVG(Current_Amount/Goal_Amount)*100, 2) 
                     FROM Campaign WHERE Status = 'Active' AND Goal_Amount > 0) AS Avg_Progress
                FROM DUAL
            `;
            
            const metrics = await db.executeQuery(metricsSql);
            
            // Recent donations for campaigns
            const recentDonationsSql = `
                SELECT d.Donation_ID, d.Donation_Date, d.Donor_ID, 
                       p.Name AS Donor_Name, c.Campaign_Name,
                       md.Amount, ikd.I_Description
                FROM Donations d
                JOIN Donor dr ON d.Donor_ID = dr.Donor_ID
                JOIN Person p ON dr.Person_ID = p.Person_ID
                LEFT JOIN Campaign c ON d.Campaign_ID = c.Campaign_ID
                LEFT JOIN Monetary_Donation md ON d.Donation_ID = md.Donation_ID
                LEFT JOIN In_Kind_Donation ikd ON d.Donation_ID = ikd.Donation_ID
                WHERE d.Donation_Date >= SYSDATE - 7
                ORDER BY d.Donation_Date DESC
                FETCH FIRST 10 ROWS ONLY
            `;
            
            const recentDonations = await db.executeQuery(recentDonationsSql);
            
            res.json({
                success: true,
                data: {
                    campaigns: result.rows,
                    metrics: metrics.rows[0],
                    recentDonations: recentDonations.rows
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching campaign dashboard',
                error: error.message
            });
        }
    }

    async getVolunteerDashboard(req, res) {
        try {
            const sql = `
                SELECT 
                    (SELECT COUNT(*) FROM Volunteer) AS Total_Volunteers,
                    (SELECT SUM(Volunteering_Hours) FROM Volunteer) AS Total_Hours,
                    (SELECT COUNT(*) FROM Volunteer WHERE Join_Date >= TRUNC(SYSDATE) - 30) AS New_Volunteers_30d,
                    (SELECT ROUND(AVG(Volunteering_Hours), 2) FROM Volunteer) AS Avg_Hours_Per_Volunteer
                FROM DUAL
            `;
            
            const result = await db.executeQuery(sql);
            
            // Top volunteers
            const topVolunteersSql = `
                SELECT v.Volunteer_ID, p.Name, v.Volunteering_Hours, v.Skills
                FROM Volunteer v
                JOIN Person p ON v.Person_ID = p.Person_ID
                ORDER BY v.Volunteering_Hours DESC
                FETCH FIRST 5 ROWS ONLY
            `;
            
            const topVolunteers = await db.executeQuery(topVolunteersSql);
            
            res.json({
                success: true,
                data: {
                    metrics: result.rows[0],
                    topVolunteers: topVolunteers.rows
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching volunteer dashboard',
                error: error.message
            });
        }
    }

    async getFinancialDashboard(req, res) {
        try {
            // Monthly financial summary
            const monthlySql = `
                SELECT 
                    TO_CHAR(d.Donation_Date, 'YYYY-MM') AS Month,
                    SUM(CASE WHEN md.Donation_ID IS NOT NULL THEN md.Amount ELSE 0 END) AS Monetary_Donations,
                    SUM(CASE WHEN ikd.Donation_ID IS NOT NULL THEN ikd.Estimated_Value ELSE 0 END) AS InKind_Donations,
                    (SELECT SUM(e.Amount) FROM Expense e 
                     WHERE TO_CHAR(e.Expense_Date, 'YYYY-MM') = TO_CHAR(d.Donation_Date, 'YYYY-MM')) AS Expenses
                FROM Donations d
                LEFT JOIN Monetary_Donation md ON d.Donation_ID = md.Donation_ID
                LEFT JOIN In_Kind_Donation ikd ON d.Donation_ID = ikd.Donation_ID
                WHERE d.Donation_Date >= ADD_MONTHS(TRUNC(SYSDATE), -6)
                GROUP BY TO_CHAR(d.Donation_Date, 'YYYY-MM')
                ORDER BY Month DESC
            `;
            
            const monthlyData = await db.executeQuery(monthlySql);
            
            // Current month totals
            const currentMonthSql = `
                SELECT 
                    (SELECT SUM(md.Amount) FROM Monetary_Donation md 
                     JOIN Donations d ON md.Donation_ID = d.Donation_ID 
                     WHERE TO_CHAR(d.Donation_Date, 'YYYY-MM') = TO_CHAR(SYSDATE, 'YYYY-MM')) AS Current_Month_Monetary,
                    (SELECT SUM(ikd.Estimated_Value) FROM In_Kind_Donation ikd 
                     JOIN Donations d ON ikd.Donation_ID = d.Donation_ID 
                     WHERE TO_CHAR(d.Donation_Date, 'YYYY-MM') = TO_CHAR(SYSDATE, 'YYYY-MM')) AS Current_Month_InKind,
                    (SELECT SUM(Amount) FROM Expense 
                     WHERE TO_CHAR(Expense_Date, 'YYYY-MM') = TO_CHAR(SYSDATE, 'YYYY-MM')) AS Current_Month_Expenses
                FROM DUAL
            `;
            
            const currentMonth = await db.executeQuery(currentMonthSql);
            
            res.json({
                success: true,
                data: {
                    monthlySummary: monthlyData.rows,
                    currentMonth: currentMonth.rows[0]
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching financial dashboard',
                error: error.message
            });
        }
    }

    async getDonorDashboard(req, res) {
        try {
            // Donor metrics
            const metricsSql = `
                SELECT 
                    (SELECT COUNT(*) FROM Donor) AS Total_Donors,
                    (SELECT COUNT(*) FROM Donor WHERE Last_Donation_Date >= TRUNC(SYSDATE) - 90) AS Active_Donors_90d,
                    (SELECT AVG(Number_Of_Times_Donated) FROM Donor) AS Avg_Donations_Per_Donor,
                    (SELECT COUNT(*) FROM Donor WHERE Last_Donation_Date IS NULL) AS New_Donors_No_Donation
                FROM DUAL
            `;
            
            const metrics = await db.executeQuery(metricsSql);
            
            // Top donors
            const topDonorsSql = `
                SELECT d.Donor_ID, p.Name, d.Number_Of_Times_Donated, d.Last_Donation_Date
                FROM Donor d
                JOIN Person p ON d.Person_ID = p.Person_ID
                ORDER BY d.Number_Of_Times_Donated DESC
                FETCH FIRST 10 ROWS ONLY
            `;
            
            const topDonors = await db.executeQuery(topDonorsSql);
            
            // Donation types breakdown
            const donationTypesSql = `
                SELECT 
                    'Monetary' AS Type,
                    COUNT(*) AS Count,
                    SUM(md.Amount) AS Total_Amount
                FROM Monetary_Donation md
                UNION ALL
                SELECT 
                    'In-Kind' AS Type,
                    COUNT(*) AS Count,
                    SUM(ikd.Estimated_Value) AS Total_Amount
                FROM In_Kind_Donation ikd
            `;
            
            const donationTypes = await db.executeQuery(donationTypesSql);
            
            res.json({
                success: true,
                data: {
                    metrics: metrics.rows[0],
                    topDonors: topDonors.rows,
                    donationTypes: donationTypes.rows
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching donor dashboard',
                error: error.message
            });
        }
    }
}

module.exports = new DashboardController();