import type { Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import type { IUser, IpAddressEntry } from "@/types/models.types";
import { TIMING_CONSTANTS } from "@/constants/timings";

const IPAddressSchema = new Schema<IpAddressEntry>(
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

        ipAddresses: {
            type: [IPAddressSchema],
            default: [],
        },

        emailVerificationTokenHash: {
            type: String,
            select: false,
            default: undefined,
        },

        emailVerificationTokenExpiresAt: {
            type: Date,
            select: false,
            default: undefined,
        },

        resetPasswordTokenHash: {
            type: String,
            select: false,
            default: undefined,
        },

        resetPasswordTokenExpiresAt: {
            type: Date,
            select: false,
            default: undefined,
        },
    },
    {
        timestamps: true,
    },
);

UserSchema.index(
    { createdAt: 1 },
    {
        name: "unverified_user_ttl_idx",
        expireAfterSeconds: TIMING_CONSTANTS.SEVEN_DAYS / 1000,
        partialFilterExpression: { isVerified: false },
    },
);

UserSchema.index(
    { emailVerificationTokenHash: 1 },
    {
        name: "email_verification_token_hash_idx",
        sparse: true,
    },
);

UserSchema.index(
    { resetPasswordTokenHash: 1 },
    {
        name: "reset_password_token_hash_idx",
        sparse: true,
    },
);

UserSchema.pre("save", function (next) {
    const MAX_IPS = 20;
    const user = this as IUser;

    if (user.isModified("ipAddresses") && user.ipAddresses.length > MAX_IPS) {
        user.ipAddresses = user.ipAddresses
            .sort((a: IpAddressEntry, b: IpAddressEntry) => (b.lastUsed?.getTime() || 0) - (a.lastUsed?.getTime() || 0))
            .slice(0, MAX_IPS);
    }

    next();
});

UserSchema.statics.findForAuth = function (email: string) {
    return this.findOne({ email: email.toLowerCase() }).select("+password");
};

UserSchema.statics.findPublicProfile = function (username: string) {
    return this.findOne({ username: username.toLowerCase() }).select("-password").lean();
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
