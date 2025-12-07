const RoleModel = require('../models/RoleModel');
const UserModel = require('../models/UserModel');

class RoleController {
    async getAllRoles(req, res) {
        try {
            const roles = await RoleModel.getAllRoles();
            res.json({
                success: true,
                data: roles
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching roles',
                error: error.message
            });
        }
    }

    async assignRole(req, res) {
        try {
            const { userId, roleId } = req.body;
            
            if (!userId || !roleId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and Role ID are required'
                });
            }
            
            // Check if user exists
            const user = await UserModel.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            await RoleModel.assignRoleToUser(userId, roleId);
            
            res.json({
                success: true,
                message: 'Role assigned successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error assigning role',
                error: error.message
            });
        }
    }

    async removeRole(req, res) {
        try {
            const { userId, roleId } = req.body;
            
            if (!userId || !roleId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and Role ID are required'
                });
            }
            
            await RoleModel.removeRoleFromUser(userId, roleId);
            
            res.json({
                success: true,
                message: 'Role removed successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error removing role',
                error: error.message
            });
        }
    }

    async getUserRoles(req, res) {
        try {
            const { userId } = req.params;
            const roles = await RoleModel.getUserRoles(userId);
            
            res.json({
                success: true,
                data: roles
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching user roles',
                error: error.message
            });
        }
    }

    async createRole(req, res) {
        try {
            const { Role_Name, Role_Description } = req.body;
            
            if (!Role_Name) {
                return res.status(400).json({
                    success: false,
                    message: 'Role name is required'
                });
            }
            
            // Check if role already exists
            const existingRole = await RoleModel.getRoleByName(Role_Name);
            if (existingRole) {
                return res.status(400).json({
                    success: false,
                    message: 'Role already exists'
                });
            }
            
            const roleData = {
                Role_Name,
                Role_Description: Role_Description || null
            };
            
            const roleId = await RoleModel.create(roleData);
            
            res.status(201).json({
                success: true,
                message: 'Role created successfully',
                data: { Role_ID: roleId }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating role',
                error: error.message
            });
        }
    }
}

module.exports = new RoleController();