const AuditModel = require('../models/AuditModel');

const auditMiddleware = (tableName, getRecordId = (req) => req.params.id) => {
    return async (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Only audit successful operations (status 2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    const userId = req.user ? req.user.userId : null;
                    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                    
                    let operation = '';
                    let recordId = null;
                    
                    switch (req.method) {
                        case 'POST':
                            operation = 'INSERT';
                            // Try to extract ID from response
                            try {
                                const responseData = JSON.parse(data);
                                if (responseData.data && responseData.data.id) {
                                    recordId = responseData.data.id;
                                }
                            } catch (e) {
                                // If response is not JSON, use getRecordId function
                                recordId = getRecordId(req);
                            }
                            break;
                        case 'PUT':
                        case 'PATCH':
                            operation = 'UPDATE';
                            recordId = getRecordId(req);
                            break;
                        case 'DELETE':
                            operation = 'DELETE';
                            recordId = getRecordId(req);
                            break;
                        default:
                            operation = 'SELECT';
                    }
                    
                    // Log the action (async, don't wait for it)
                    if (operation !== 'SELECT' && recordId) {
                        AuditModel.logAction(
                            userId,
                            tableName,
                            operation,
                            recordId,
                            req.body, // Old values (for update we don't have them easily)
                            req.body, // New values
                            ipAddress
                        ).catch(err => {
                            console.error('Failed to log audit action:', err);
                        });
                    }
                } catch (error) {
                    console.error('Audit middleware error:', error);
                }
            }
            
            // Call original send function
            originalSend.call(this, data);
        };
        
        next();
    };
};

module.exports = auditMiddleware;