import mongoose, { Schema, Model } from "mongoose";
import { IUser } from "@/types/UserInterface";

const RefreshTokenSchema = new Schema(
    {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
        userAgent: String,
        ipAddress: String,
        isRevoked: { type: Boolean, default: false },
    },
    { _id: false },
);

const IPAddressSchema = new Schema(
    {
        ip: String,
        lastUsed: Date,
        userAgent: String,
    },
    { _id: false },
);

const UserSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        username: {
            type: String,
            lowercase: true,
            required: true,
            unique: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            select: false,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        lastLogin: {
            type: Date,
            default: Date.now,
        },

        resetPasswordToken: String,
        resetPasswordTokenExpiresAt: Date,

        emailVerificationToken: String,
        emailVerificationTokenExpiresAt: Date,

        refreshTokens: {
            type: [RefreshTokenSchema],
            default: [],
        },

        ipAddresses: {
            type: [IPAddressSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    },
);

/* INDEXES */
UserSchema.index({ email: 1, isVerified: 1 }, { name: "email_verified_idx" });

UserSchema.index({ resetPasswordToken: 1, resetPasswordTokenExpiresAt: 1 }, { sparse: true });

UserSchema.index({ emailVerificationToken: 1, emailVerificationTokenExpiresAt: 1 }, { sparse: true });

UserSchema.index({ "refreshTokens.token": 1 }, { sparse: true });

/* PRE-SAVE SAFETY LIMITS */
UserSchema.pre("save", function (next) {
    const MAX_REFRESH_TOKENS = 10;
    const MAX_IPS = 20;

    if (this.isModified("refreshTokens") && this.refreshTokens.length > MAX_REFRESH_TOKENS) {
        this.refreshTokens = this.refreshTokens.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, MAX_REFRESH_TOKENS);
    }

    if (this.isModified("ipAddresses") && this.ipAddresses.length > MAX_IPS) {
        this.ipAddresses = this.ipAddresses.sort((a, b) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0)).slice(0, MAX_IPS);
    }

    next();
});

/* STATIC HELPERS */
UserSchema.statics.findForAuth = function (email: string) {
    return this.findOne({ email: email.toLowerCase() }).select("+password");
};

UserSchema.statics.findPublicProfile = function (username: string) {
    return this.findOne({ username: username.toLowerCase() }).select("-password -refreshTokens -resetPasswordToken").lean();
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
