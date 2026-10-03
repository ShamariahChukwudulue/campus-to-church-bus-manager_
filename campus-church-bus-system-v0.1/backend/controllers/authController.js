const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { GENDERS, UNIVERSITIES } = require('../config/constants');

/**
 * Generate a signed JWT token for an authenticated user.
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'supersecret_campus_church_bus_jwt_key_2026_dev_only',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * @desc    Register a new student account
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerStudent = async (req, res, next) => {
  try {
    const { name, studentId, gender, university, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !studentId || !gender || !university || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, studentId, gender, university, email, phone, and password.'
      });
    }

    // Normalise gender (accept "male", "FEMALE", etc.) then validate against the allowed list
    const normalizedGender = GENDERS.find(
      (g) => g.toLowerCase() === String(gender).trim().toLowerCase()
    );
    if (!normalizedGender) {
      return res.status(400).json({
        success: false,
        message: `Gender must be one of: ${GENDERS.join(', ')}.`
      });
    }

    // University must match one of the approved institutions exactly
    const normalizedUniversity = UNIVERSITIES.find(
      (u) => u.toLowerCase() === String(university).trim().toLowerCase()
    );
    if (!normalizedUniversity) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid university from the list.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check for existing user by email
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Check for existing user by student ID
    const studentIdExists = await User.findOne({ studentId: studentId.toUpperCase().trim() });
    if (studentIdExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this Student ID / Matriculation number already exists.'
      });
    }

    // Create student
    const student = await User.create({
      name: name.trim(),
      studentId: studentId.toUpperCase().trim(),
      gender: normalizedGender,
      university: normalizedUniversity,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: 'student'
    });

    const token = generateToken(student);

    res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      data: {
        token,
        user: {
          id: student._id,
          name: student.name,
          studentId: student.studentId,
          gender: student.gender,
          university: student.university,
          email: student.email,
          phone: student.phone,
          role: student.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login for students and administrators
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter both email and password.'
      });
    }

    // Query user and explicitly include password field
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          studentId: user.studentId,
          gender: user.gender,
          university: user.university,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User profile retrieved.',
    data: {
      user: req.user
    }
  });
};

module.exports = {
  registerStudent,
  login,
  getCurrentUser
};
