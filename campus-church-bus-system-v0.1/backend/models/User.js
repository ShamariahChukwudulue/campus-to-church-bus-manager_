const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { GENDERS, UNIVERSITIES } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    studentId: {
      type: String,
      trim: true,
      uppercase: true,
      // Sparse allows multiple nulls/undefined for admin users
      sparse: true,
      index: true
    },
    gender: {
      type: String,
      enum: {
        values: GENDERS,
        message: 'Gender must be either Male or Female'
      },
      // Required for students only (the seeded admin account has no gender)
      required: [
        function () { return this.role === 'student'; },
        'Please select your gender'
      ]
    },
    university: {
      type: String,
      enum: {
        values: UNIVERSITIES,
        message: 'Please select a valid university from the list'
      },
      required: [
        function () { return this.role === 'student'; },
        'Please select your university'
      ]
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    phone: {
      type: String,
      required: [true, 'Please provide a contact phone number'],
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Do not include in queries by default
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare entered password with hashed password in database
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
