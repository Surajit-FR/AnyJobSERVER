import mongoose, { Schema, Model } from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IUser } from "../../types/schemaTypes";


const UserSchema: Schema<IUser> = new Schema({
    fullName: {
        type: String,
        required: false,
        trim: true,
        index: true,
    },
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
        // unique: true,
        lowercase: true,
        default: ""
    },
    dob: {
        type: Date,
        default: null
    },
    phone: {
        type: String,
        default:"",
        required: false,
        // unique:true
    },
    password: {
        type: String,
        // required: [true, "Password is required"],
    },  
    oldPassword: {
        type: String,
        // required: [true, "Password is required"],
    },
    avatar: {
        type: String,
        default: "",
        required: false,
    },
    coverImage: {
        type: String,
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    userType: {
        type: String,
        enum: ["SuperAdmin", "ServiceProvider", "Customer", "FieldAgent", "TeamLead", "Admin", "Finance"],
        default: ""
    },
    refreshToken: {
        type: String,
        default: "",
    },
    fcmToken: {
        type: String,
        default: "",
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    geoLocation: {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number],
        },
    },
}, { timestamps: true });

//pre - save hook for hashing password
UserSchema.pre("save", async function (next) {
    console.log("hashed done");
    // if (!this.email) return next();
    if (!this.isModified("password")) return next();
    try {
        this.password = await bcrypt.hash(this.password, 10);
        console.log(this.password, "hashed password during sign up");
        next();
    } catch (err: any) {
        next(err)
    }
});

//check password
UserSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
    console.log("isPasswordCorrect checked", password);
    console.log(this.password);
    console.log(await bcrypt.compare(password, this.password));
    return await bcrypt.compare(password, this.password)
}

//generate acces token
UserSchema.methods.generateAccessToken = function (): string {

    return jwt.sign({
        _id: this._id,
        email: this.email,
        phone: this.phone,
        username: this.username,
        fullName: this.fullName,
    }, process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY })
};

UserSchema.methods.generateRefreshToken = function (): string {
    return jwt.sign({
        _id: this._id
    }, process.env.REFRESH_TOKEN_SECRET as string, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY })
};

//adding geospatial index
UserSchema.index({ geoLocation: "2dsphere" });

const UserModel: Model<IUser> = mongoose.model<IUser>("user", UserSchema);
export default UserModel;

