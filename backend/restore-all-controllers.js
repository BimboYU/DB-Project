// restore-all-controllers.js
const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/controllers');

console.log('🔧 Restoring all controller files...\n');

// 1. authController.js
const authControllerContent = `const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const PersonModel = require('../models/PersonModel');
const DonorModel = require('../models/DonorModel');
const RoleModel = require('../models/RoleModel');

class AuthController {
    async register(req, res) {
        try {
            const { 
                Name, Email, Contact_No, Address, Age,
                Username, Password, Role_ID 
            } = req.body;
            
            // Validation
            if (!Name || !Email || !Username || !Password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, Email, Username, and Password are required'
                });
            }
            
            // Check if username already exists
            const existingUser = await UserModel.findByUsername(Username);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username already exists'
                });
            }
            
            // Check if email already exists
            const existingEmail = await PersonModel.findByEmail(Email);
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }
            
            // Create person
            const personData = {
                Name, Email, Contact_No, Address, Age: Age ? parseInt(Age) : null
            };
            const personId = await PersonModel.createPerson(personData);
            
            // Hash password
            const hashedPassword = await bcrypt.hash(Password, 10);
            
            // Create user
            const userData = {
                PERSON_ID: personId,
                USERNAME: Username,
                USER_PASSWORD: hashedPassword,
                IS_ACTIVE: 'Y'
            };
            const userId = await UserModel.createUser(userData);
            
            // Create donor record automatically (optional)
            try {
                await DonorModel.createDonor(personId);
            } catch (error) {
                console.log('Note: Could not create donor record:', error.message);
            }
            
            // Assign default role if provided
            if (Role_ID) {
                try {
                    await RoleModel.assignRoleToUser(userId, Role_ID);
                } catch (error) {
                    console.log('Note: Could not assign role:', error.message);
                }
            }
            
            // Generate token
            const token = jwt.sign(
                { userId, username: Username, personId },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    userId,
                    personId,
                    username: Username,
                    token
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error registering user',
                error: error.message
            });
        }
    }

    async login(req, res) {
        try {
            const { Username, Password } = req.body;
            
            if (!Username || !Password) {
                return res.status(400).json({
                    success: false,
                    message: 'Username and Password are required'
                });
            }
            
            // Find user
            const user = await UserModel.findByUsername(Username);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // Check if user is active
            if (user.IS_ACTIVE !== 'Y') {
                return res.status(401).json({
                    success: false,
                    message: 'Account is deactivated'
                });
            }
            
            // Verify password
            const isPasswordValid = await bcrypt.compare(Password, user.USER_PASSWORD);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
            
            // Update last login
            await UserModel.updateLastLogin(user.USER_ID);
            
            // Get user roles
            const roles = await RoleModel.getUserRoles(user.USER_ID);
            const roleNames = roles.map(role => role.ROLE_NAME);
            
            // Get person details
            const person = await PersonModel.findById(user.PERSON_ID);
            
            // Generate token
            const token = jwt.sign(
                { 
                    userId: user.USER_ID, 
                    username: user.USERNAME, 
                    personId: user.PERSON_ID,
                    roles: roleNames 
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    userId: user.USER_ID,
                    username: user.USERNAME,
                    personId: user.PERSON_ID,
                    name: person ? person.NAME : '',
                    email: person ? person.EMAIL : '',
                    roles: roleNames,
                    token
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error logging in',
                error: error.message
            });
        }
    }

    async getProfile(req, res) {
        try {
            const userId = req.user.userId;
            
            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const person = await PersonModel.findById(user.PERSON_ID);
            const roles = await RoleModel.getUserRoles(userId);
            
            res.json({
                success: true,
                data: {
                    user: {
                        userId: user.USER_ID,
                        username: user.USERNAME,
                        isActive: user.IS_ACTIVE,
                        lastLogin: user.LAST_LOGIN
                    },
                    person: person,
                    roles: roles
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching profile',
                error: error.message
            });
        }
    }

    async changePassword(req, res) {
        try {
            const userId = req.user.userId;
            const { currentPassword, newPassword } = req.body;
            
            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }
            
            // Get user
            const user = await UserModel.findById(userId);
            
            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.USER_PASSWORD);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
            
            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
                
            // Update password
            await UserModel.updatePassword(userId, hashedPassword);
            
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error changing password',
                error: error.message
            });
        }
    }
}

module.exports = new AuthController();`;

// 2. personController.js
const personControllerContent = `const PersonModel = require('../models/PersonModel');

class PersonController {
    async getAllPersons(req, res) {
        try {
            const { page = 1, limit = 100, search } = req.query;
            const offset = (page - 1) * limit;
            
            let persons;
            let total;
            
            if (search) {
                persons = await PersonModel.searchPersons(search);
                total = persons.length;
            } else {
                persons = await PersonModel.findAll({}, limit, offset);
                total = await PersonModel.count();
            }
            
            res.json({
                success: true,
                data: persons,
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
                message: 'Error fetching persons',
                error: error.message
            });
        }
    }

    async getPersonById(req, res) {
        try {
            const person = await PersonModel.findById(req.params.id);
            if (!person) {
                return res.status(404).json({
                    success: false,
                    message: 'Person not found'
                });
            }
            
            res.json({
                success: true,
                data: person
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching person',
                error: error.message
            });
        }
    }

    async createPerson(req, res) {
        try {
            const { Name, Age, Contact_No, Email, Address } = req.body;
            
            // Validation
            if (!Name || !Email) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and Email are required'
                });
            }
            
            // Check if email already exists
            const existingPerson = await PersonModel.findByEmail(Email);
            if (existingPerson) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            const personData = {
                Name,
                Age: Age ? parseInt(Age) : null,
                Contact_No: Contact_No || null,
                Email,
                Address: Address || null
            };
            
            const personId = await PersonModel.createPerson(personData);
            
            res.status(201).json({
                success: true,
                message: 'Person created successfully',
                data: { personId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating person',
                error: error.message
            });
        }
    }

    async updatePerson(req, res) {
        try {
            const personId = req.params.id;
            const { Name, Age, Contact_No, Email, Address } = req.body;
            
            const person = await PersonModel.findById(personId);
            if (!person) {
                return res.status(404).json({
                    success: false,
                    message: 'Person not found'
                });
            }
            
            // Check if email is being changed and already exists
            if (Email && Email !== person.EMAIL) {
                const existingPerson = await PersonModel.findByEmail(Email);
                if (existingPerson && existingPerson.PERSON_ID !== parseInt(personId)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email already exists'
                    });
                }
            }
            
            const updateData = {};
            if (Name !== undefined) updateData.Name = Name;
            if (Age !== undefined) updateData.Age = Age ? parseInt(Age) : null;
            if (Contact_No !== undefined) updateData.Contact_No = Contact_No;
            if (Email !== undefined) updateData.Email = Email;
            if (Address !== undefined) updateData.Address = Address;
            
            const updated = await PersonModel.updatePerson(personId, updateData);
            
            if (updated) {
                res.json({
                    success: true,
                    message: 'Person updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to update person'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating person',
                error: error.message
            });
        }
    }

    async deletePerson(req, res) {
        try {
            const personId = req.params.id;
            const deleted = await PersonModel.delete(personId);
            
            if (deleted) {
                res.json({
                    success: true,
                    message: 'Person deleted successfully'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: 'Person not found'
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting person',
                error: error.message
            });
        }
    }
}

module.exports = new PersonController();`;

// 3. donationController.js
const donationControllerContent = `const DonationModel = require('../models/DonationModel');
const DonorModel = require('../models/DonorModel');
const CampaignModel = require('../models/CampaignModel');

class DonationController {
    async createMonetaryDonation(req, res) {
        try {
            const { 
                Donor_ID, Amount, Payment_Method, 
                Transaction_ID, Campaign_ID 
            } = req.body;
            
            // Validation
            if (!Donor_ID || !Amount || !Payment_Method) {
                return res.status(400).json({
                    success: false,
                    message: 'Donor ID, Amount, and Payment Method are required'
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
            
            // Verify donor exists
            const donor = await DonorModel.findById(Donor_ID);
            if (!donor) {
                return res.status(404).json({
                    success: false,
                    message: 'Donor not found'
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
            
            const donationData = {
                Donor_ID,
                Amount: amountNum,
                Payment_Method,
                Transaction_ID: Transaction_ID || null,
                Campaign_ID: Campaign_ID || null
            };
            
            const donationId = await DonationModel.createMonetaryDonation(donationData);
            
            res.status(201).json({
                success: true,
                message: 'Donation recorded successfully',
                data: { donationId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error recording donation',
                error: error.message
            });
        }
    }

    async getDonations(req, res) {
        try {
            const { 
                page = 1, 
                limit = 50, 
                donorId, 
                campaignId,
                startDate,
                endDate
            } = req.query;
            
            const offset = (page - 1) * limit;
            
            let donations;
            let total;
            
            if (donorId) {
                // Get donations by donor
                donations = await DonationModel.findAll({ DONOR_ID: donorId }, limit, offset);
                total = await DonationModel.count({ DONOR_ID: donorId });
            } else if (campaignId) {
                // Get donations by campaign
                donations = await DonationModel.getDonationsByCampaign(campaignId);
                total = donations.length;
            } else {
                donations = await DonationModel.findAll({}, limit, offset);
                total = await DonationModel.count();
            }
            
            // Filter by date if provided
            if (startDate && endDate) {
                donations = donations.filter(donation => {
                    const donationDate = new Date(donation.DONATION_DATE);
                    return donationDate >= new Date(startDate) && donationDate <= new Date(endDate);
                });
            }
            
            res.json({
                success: true,
                data: donations,
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
                message: 'Error fetching donations',
                error: error.message
            });
        }
    }

    async getDonationById(req, res) {
        try {
            const donation = await DonationModel.getDonationWithDetails(req.params.id);
            if (!donation) {
                return res.status(404).json({
                    success: false,
                    message: 'Donation not found'
                });
            }
            
            res.json({
                success: true,
                data: donation
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching donation',
                error: error.message
            });
        }
    }

    async getDonationSummary(req, res) {
        try {
            const { startDate, endDate } = req.query;
            
            // Default to last month if no dates provided
            const defaultEndDate = new Date();
            const defaultStartDate = new Date();
            defaultStartDate.setMonth(defaultStartDate.getMonth() - 1);
            
            const summary = await DonationModel.getDonationSummary(
                startDate || defaultStartDate,
                endDate || defaultEndDate
            );
            
            res.json({
                success: true,
                data: summary
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching donation summary',
                error: error.message
            });
        }
    }
}

module.exports = new DonationController();`;

// Restore the files
const files = [
    { name: 'authController.js', content: authControllerContent },
    { name: 'personController.js', content: personControllerContent },
    { name: 'donationController.js', content: donationControllerContent }
];

files.forEach(file => {
    const filePath = path.join(controllersDir, file.name);
    try {
        // Backup the empty file first (just in case)
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                const backupPath = filePath + '.empty.backup';
                fs.copyFileSync(filePath, backupPath);
                console.log(`📦 Backed up empty ${file.name} to ${backupPath}`);
            }
        }
        
        // Write the new content
        fs.writeFileSync(filePath, file.content, 'utf8');
        console.log(`✅ Restored ${file.name} (${file.content.length} bytes)`);
    } catch (error) {
        console.log(`❌ Error restoring ${file.name}: ${error.message}`);
    }
});

console.log('\n✨ Restoration complete!');
console.log('\n📋 Next steps:');
console.log('1. Verify the files now have content:');
console.log('   notepad src\\controllers\\authController.js');
console.log('2. Test the controllers:');
console.log('   node test-all-controllers.js');
console.log('3. If they still show as empty, check disk permissions');