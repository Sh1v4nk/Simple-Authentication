import mongoose, { Schema, Model } from "mongoose";
import { type IUser } from "@/types/UserInterface";

const UserSchema: Schema<IUser> = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true, // Index for faster email lookups
        },
        password: {
            type: String,
            required: true,
            select: false, // Don't include password in queries by default
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true, // Index for faster username lookups
        },
        lastLogin: {
            type: Date,
            default: Date.now,
            index: true, // Index for sorting by last login
        },
        isVerified: {
            type: Boolean,
            default: false,
            index: true, // Index for filtering verified users
        },
        resetPasswordToken: {
            type: String,
            index: { sparse: true }, // Sparse index since not all users have reset tokens
        },
        resetPasswordTokenExpiresAt: {
            type: Date,
            index: { sparse: true }, // Sparse index for efficient queries
        },
        emailVerificationToken: {
            type: String,
            index: { sparse: true }, // Sparse index for verification tokens
        },
        emailVerificationTokenExpiresAt: {
            type: Date,
            index: { sparse: true }, // Sparse index for efficient queries
        },
        loginAttempts: {
            type: Number,
            default: 0,
            index: true, // Index for rate limiting queries
        },
        lockUntil: {
            type: Date,
            index: { sparse: true }, // Index for account lockout functionality
        },
        ipAddresses: [
            {
                ip: String,
                lastUsed: Date,
                userAgent: String,
            },
        ], // Track login IPs for security
        refreshTokens: [
            {
                token: {
                    type: String,
                    required: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                expiresAt: {
                    type: Date,
                    required: true,
                },
                userAgent: String,
                ipAddress: String,
                isRevoked: {
                    type: Boolean,
                    default: false,
                },
            },
        ], // Store multiple refresh tokens for multi-device support
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common query patterns
UserSchema.index({ email: 1, isVerified: 1 }); // Login queries
UserSchema.index({ username: 1, isVerified: 1 }); // Profile queries
UserSchema.index({ resetPasswordToken: 1, resetPasswordTokenExpiresAt: 1 }); // Password reset
UserSchema.index({ emailVerificationToken: 1, emailVerificationTokenExpiresAt: 1 }); // Email verification
UserSchema.index({ createdAt: -1 }); // Recent users
UserSchema.index({ lastLogin: -1 }); // Recent activity
UserSchema.index({ loginAttempts: 1, lockUntil: 1 }); // Security queries

// Note: Text index for search is created separately in ensureIndexes() to avoid collation conflicts

// Virtual for account lock status
UserSchema.virtual("isLocked").get(function () {
    return !!(this.lockUntil && this.lockUntil > new Date());
});

// Pre-save middleware to handle password selection
UserSchema.pre("save", function (next) {
    // Only hash password if it has been modified (or is new)
    if (!this.isModified("password")) return next();
    next();
});

// Query optimization methods
UserSchema.statics.findByEmailOptimized = function (email: string) {
    return this.findOne({ email: email.toLowerCase() })
        .select("+password") // Explicitly include password for authentication
        .lean({ virtuals: true }); // Use lean queries for better performance
};

UserSchema.statics.findByUsernameOptimized = function (username: string) {
    return this.findOne({ username: username.toLowerCase() })
        .select("-password") // Exclude password for profile queries
        .lean({ virtuals: true });
};

UserSchema.statics.findVerifiedUsers = function (page = 1, limit = 10) {
    return this.find({ isVerified: true })
        .select("-password")
        .sort({ lastLogin: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
