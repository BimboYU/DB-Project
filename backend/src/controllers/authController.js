const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const UserModel = require("../models/UserModel");
const PersonModel = require("../models/PersonModel");
const DonorModel = require("../models/DonorModel");
const RoleModel = require("../models/RoleModel");

class AuthController {
  async register(req, res) {
    try {
      const {
        Name,
        Email,
        Contact_No,
        Address,
        Age,
        Username,
        Password,
        Role_ID,
      } = req.body;

      // Validation
      if (!Name || !Email || !Username || !Password) {
        return res.status(400).json({
          success: false,
          message: "Name, Email, Username, and Password are required",
        });
      }

      // Check if username already exists
      const existingUser = await UserModel.findByUsername(Username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }

      // Check if email already exists
      const existingEmail = await PersonModel.findByEmail(Email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      // Create person
      const personData = {
        NAME: Name,
        EMAIL: Email,
        CONTACT_NO: Contact_No,
        ADDRESS: Address,
        AGE: Age ? parseInt(Age) : null,
      };
      const personId = await PersonModel.createPerson(personData);

      // Hash password
      const hashedPassword = await bcrypt.hash(Password, 10);

      // Create user
      const userData = {
        PERSON_ID: personId,
        USERNAME: Username,
        USER_PASSWORD: hashedPassword,
        IS_ACTIVE: "Y",
      };
      const userId = await UserModel.createUser(userData);

      // Create donor record automatically (optional)
      try {
        await DonorModel.createDonor(personId);
      } catch (error) {
        console.log("Note: Could not create donor record:", error.message);
      }

      // Assign default Staff role (ID 2)
      try {
        await RoleModel.assignRoleToUser(userId, 2);
        console.log("Assigned default Staff role to new user");
      } catch (error) {
        console.log("Note: Could not assign default role:", error.message);
      }

      // Assign additional role if provided
      if (Role_ID && Role_ID !== 2) {
        try {
          await RoleModel.assignRoleToUser(userId, Role_ID);
        } catch (error) {
          console.log("Note: Could not assign additional role:", error.message);
        }
      }

      // Generate token
      const token = jwt.sign(
        { userId, username: Username, personId },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          userId,
          personId,
          username: Username,
          token,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error registering user",
        error: error.message,
      });
    }
  }

  async login(req, res) {
    try {
      const { Username, Password } = req.body;

      if (!Username || !Password) {
        return res.status(400).json({
          success: false,
          message: "Username and Password are required",
        });
      }

      // Find user
      const user = await UserModel.findByUsername(Username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check if user is active
      if (user.IS_ACTIVE !== "Y") {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated",
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        Password,
        user.USER_PASSWORD
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Update last login
      await UserModel.updateLastLogin(user.USER_ID);

      // Get user roles
      const roles = await RoleModel.getUserRoles(user.USER_ID);
      const roleNames = roles.map((role) => role.ROLE_NAME);

      // Get person details
      const person = await PersonModel.findById(user.PERSON_ID);

      // Generate token
      const token = jwt.sign(
        {
          userId: user.USER_ID,
          username: user.USERNAME,
          personId: user.PERSON_ID,
          roles: roleNames,
        },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        message: "Login successful",
        data: {
          userId: user.USER_ID,
          username: user.USERNAME,
          personId: user.PERSON_ID,
          name: person ? person.NAME : "",
          email: person ? person.EMAIL : "",
          roles: roleNames,
          token,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error logging in",
        error: error.message,
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
          message: "User not found",
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
            lastLogin: user.LAST_LOGIN,
          },
          person: person,
          roles: roles,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error fetching profile",
        error: error.message,
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
          message: "Current password and new password are required",
        });
      }

      // Get user
      const user = await UserModel.findById(userId);

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.USER_PASSWORD
      );
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await UserModel.updatePassword(userId, hashedPassword);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error changing password",
        error: error.message,
      });
    }
  }
}

module.exports = new AuthController();
