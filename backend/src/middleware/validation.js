const { body, param, query, validationResult } = require('express-validator');

const validateRequest = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }
        
        next();
    };
};

// Common validation rules
const personValidationRules = [
    body('Name').notEmpty().withMessage('Name is required').trim().escape(),
    body('Email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('Age').optional().isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),
    body('Contact_No').optional().isMobilePhone().withMessage('Valid contact number is required')
];

const donationValidationRules = [
    body('Donor_ID').isInt().withMessage('Valid Donor ID is required'),
    body('Amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('Payment_Method').notEmpty().withMessage('Payment method is required')
];

const campaignValidationRules = [
    body('Campaign_Name').notEmpty().withMessage('Campaign name is required'),
    body('Campaign_Type').notEmpty().withMessage('Campaign type is required'),
    body('Goal_Amount').isFloat({ min: 0.01 }).withMessage('Valid goal amount is required'),
    body('Start_Date').optional().isISO8601().withMessage('Valid start date is required'),
    body('End_Date').optional().isISO8601().withMessage('Valid end date is required')
];

const idParamValidation = [
    param('id').isInt().withMessage('Valid ID is required')
];

const paginationValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

module.exports = {
    validateRequest,
    personValidationRules,
    donationValidationRules,
    campaignValidationRules,
    idParamValidation,
    paginationValidation
};