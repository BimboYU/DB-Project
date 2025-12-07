// middleware/auth.js
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const authMiddleware = (roles = []) => {
    return async (req, res, next) => {
        try {
            // 1. Get token from header
            const token = req.header('Authorization')?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Access denied. No token provided.'
                });
            }
            
            // 2. Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 3. Get user from database
            const user = await UserModel.findById(decoded.userId);
            if (!user || user.IS_ACTIVE !== 'Y') {
                return res.status(401).json({
                    success: false,
                    message: 'User not found or inactive'
                });
            }
            
            // 4. Get user roles (if you have role-based access)
            if (roles.length > 0) {
                const userRoles = await UserModel.getUserRoles(decoded.userId);
                const roleNames = userRoles.map(role => role.ROLE_NAME);
                
                const hasRole = roles.some(role => roleNames.includes(role));
                if (!hasRole) {
                    return res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                }
            }
            
            // 5. Attach user to request
            req.user = {
                userId: user.USER_ID,
                username: user.USERNAME,
                personId: user.PERSON_ID
            };
            
            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            }
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired'
                });
            }
            
            console.error('Auth middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    };
};

module.exports = authMiddleware;