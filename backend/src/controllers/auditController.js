const AuditModel = require('../models/AuditModel');

class AuditController {
    async getAuditLogs(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50,
                userId,
                tableName,
                operation,
                startDate,
                endDate
            } = req.query;
            
            const filters = {};
            if (userId) filters.userId = userId;
            if (tableName) filters.tableName = tableName;
            if (operation) filters.operation = operation;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const result = await AuditModel.getAuditLogs(filters, page, limit);
            
            res.json({
                success: true,
                ...result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching audit logs',
                error: error.message
            });
        }
    }

    async getAuditLogsByRecord(req, res) {
        try {
            const { tableName, recordId } = req.params;
            
            const logs = await AuditModel.getAuditLogsByRecord(tableName, recordId);
            
            res.json({
                success: true,
                data: logs
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching audit logs for record',
                error: error.message
            });
        }
    }

    async getRecentActivities(req, res) {
        try {
            const { limit = 20 } = req.query;
            const activities = await AuditModel.getRecentActivities(limit);
            
            res.json({
                success: true,
                data: activities
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching recent activities',
                error: error.message
            });
        }
    }

    async exportAuditLogs(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Start date and end date are required'
                });
            }
            
            const filters = { startDate, endDate };
            const result = await AuditModel.getAuditLogs(filters, 1, 10000); // Get all logs
            
            // Format for CSV/Excel export
            const csvData = result.data.map(log => ({
                Timestamp: log.TIMESTAMP,
                User: log.USER_NAME || log.USERNAME || 'N/A',
                Table: log.TABLE_NAME,
                Operation: log.OPERATION,
                Record_ID: log.RECORD_ID,
                IP_Address: log.IP_ADDRESS || 'N/A'
            }));
            
            // Generate CSV
            const csvHeaders = ['Timestamp', 'User', 'Table', 'Operation', 'Record_ID', 'IP_Address'];
            let csvContent = csvHeaders.join(',') + '\n';
            
            csvData.forEach(row => {
                const rowData = [
                    row.Timestamp,
                    `"${row.User}"`,
                    row.Table,
                    row.Operation,
                    row.Record_ID,
                    row.IP_Address
                ];
                csvContent += rowData.join(',') + '\n';
            });
            
            const filename = `audit_logs_${startDate}_to_${endDate}.csv`;
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            res.send(csvContent);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error exporting audit logs',
                error: error.message
            });
        }
    }
}

module.exports = new AuditController();