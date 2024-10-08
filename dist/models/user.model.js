"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserSchema = new mongoose_1.Schema({
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
        required: [true, "Email Address is required"],
        unique: true,
        lowercase: true,
    },
    dob: {
        type: Date
    },
    phone: {
        type: String,
        default: "",
        required: false
    },
    password: {
        type: String,
        required: [true, "Password is required"],
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
UserSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified("password"))
            return next();
        try {
            this.password = yield bcrypt_1.default.hash(this.password, 10);
            next();
        }
        catch (err) {
            next(err);
        }
    });
});
//check password
UserSchema.methods.isPasswordCorrect = function (password) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield bcrypt_1.default.compare(password, this.password);
    });
};
//generate acces token
UserSchema.methods.generateAccessToken = function () {
    return jsonwebtoken_1.default.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
};
UserSchema.methods.generateRefreshToken = function () {
    return jsonwebtoken_1.default.sign({
        _id: this._id
    }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
};
const UserModel = mongoose_1.default.model("User", UserSchema);
exports.default = UserModel;