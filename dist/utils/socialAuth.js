"use strict";
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
exports.FacebookAuth = exports.GoogleAuth = void 0;
const user_model_1 = __importDefault(require("../models/user.model"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const SecurePassword = (password) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Generate a salt with a cost factor of 10 (you can increase this for more security)
        const salt = yield bcrypt_1.default.genSalt(10);
        // Hash the password using the salt
        const hashedPassword = yield bcrypt_1.default.hash(password, salt);
        return hashedPassword;
    }
    catch (error) {
        throw new Error('Error while hashing the password');
    }
});
// GoogleAuth
const GoogleAuth = (email, uid, displayName, photoURL, phoneNumber, userType) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const HashedPassword = yield SecurePassword(uid);
        let trimmed = displayName.trim().split(' ');
        console.log(trimmed);
        const NewUser = new user_model_1.default({
            lastName: trimmed.pop(),
            firstName: trimmed.join(' '),
            avatar: photoURL,
            email: email,
            phone: phoneNumber,
            password: HashedPassword,
            userType: userType
        });
        const userData = yield NewUser.save();
        return userData;
    }
    catch (exc) {
        console.log(exc.message);
        return { message: "Error login with gmail!", err: exc.message };
    }
    ;
});
exports.GoogleAuth = GoogleAuth;
const FacebookAuth = (email, uid, displayName, photoURL, phoneNumber, userType) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const HashedPassword = yield SecurePassword(uid);
        let trimmed = displayName.trim().split(' ');
        console.log(trimmed);
        const NewUser = new user_model_1.default({
            lastName: trimmed.pop(),
            firstName: trimmed.join(' '),
            email: email,
            phone: phoneNumber,
            password: HashedPassword,
            userType: userType
        });
        const userData = yield NewUser.save();
        return userData;
    }
    catch (exc) {
        console.log(exc.message);
        return { message: "Error logging in with Facebook!", err: exc.message };
    }
});
exports.FacebookAuth = FacebookAuth;
