import mongoose, { Schema, Model } from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUser } from "../../types/schemaTypes";
import { emit } from "process";


const UserSchema: Schema<IUser> = new Schema({
    firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
        index: true,
    },
    lastName: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: [true, "Email Address is required"],
        unique: true,
        lowercase: true,
    },
    phone: {
        type: Number,
        required: false
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    avatar: {
        type: String,
        required: true,
    },
    signupType: {
        type: String,
        default: "regular"
    },
    userType: {
        type: String,
        enum: ["SuperAdmin", "ServiceProvider", "Customer"],
        default: ""
    },
    refreshToken: {
        type: String,
        default: "",
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

//pre - save hook for hashing password
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (err: any) {
        next(err)
    }
});

//check password
UserSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password)
}

//generate acces token
UserSchema.methods.generateAccessToken = function (): string {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
    }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY })
};

UserSchema.methods.generateRefreshToken = function (): string {
    return jwt.sign({
        _id: this._id
    }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY })
};


const UserModel: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default UserModel;