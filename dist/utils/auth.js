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
exports.CheckJWTTokenExpiration = exports.addUser = exports.generatePasswordFromFirstName = void 0;
exports.getCardType = getCardType;
exports.isNotificationPreferenceOn = isNotificationPreferenceOn;
const user_model_1 = __importDefault(require("../models/user.model"));
const ApisErrors_1 = require("../utils/ApisErrors");
const permission_model_1 = __importDefault(require("../models/permission.model"));
const sendMail_1 = require("./sendMail");
const auth_controller_1 = require("../controller/auth/auth.controller");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_1 = require("./response");
const card_validator_1 = __importDefault(require("card-validator"));
const userPreference_model_1 = __importDefault(require("../models/userPreference.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const stripe_controller_1 = require("../controller/stripe.controller");
const generatePasswordFromFirstName = (firstName) => {
    if (!firstName)
        return "User@123"; // Default fallback password
    return `${firstName.charAt(0).toUpperCase()}${firstName.slice(1).toLowerCase()}@123`;
};
exports.generatePasswordFromFirstName = generatePasswordFromFirstName;
const addUser = (userData) => __awaiter(void 0, void 0, void 0, function* () {
    const { firstName, lastName, email, userType, phone, avatar } = userData;
    let password = userData.password; // Default to provided password
    let permission, generatedPass;
    if (phone) {
        const existingPhone = yield user_model_1.default.findOne({ phone });
        if (existingPhone) {
            // console.log(existingPhone);
            throw new ApisErrors_1.ApiError(409, "User with phone already exists");
        }
    }
    if (email) {
        const existingEmail = yield user_model_1.default.findOne({ email });
        if (existingEmail) {
            throw new ApisErrors_1.ApiError(409, "User with email already exists");
        }
    }
    if (!password || (email && phone)) {
        password = (0, exports.generatePasswordFromFirstName)(firstName);
    }
    generatedPass = password;
    // Generate a random password
    // password = generateRandomPassword();
    // generatedPass = password;
    // Create the new user
    const newUser = yield user_model_1.default.create({
        firstName,
        lastName,
        email,
        password,
        userType,
        phone,
        avatar
    });
    // console.log(newUser,"user signup data afetr db operation");
    const fetchUser = yield (0, auth_controller_1.fetchUserData)(newUser._id);
    const savedUser = fetchUser[0];
    // Adding permissions based on userType
    if (savedUser && (savedUser.userType === "SuperAdmin" || savedUser.userType === "ServiceProvider")) {
        permission = {
            userId: savedUser._id,
            acceptRequest: true,
            assignJob: true,
            fieldAgentManagement: true,
        };
    }
    else {
        permission = {
            userId: savedUser._id,
            acceptRequest: false,
            assignJob: false,
            fieldAgentManagement: false,
        };
    }
    const userPermissionSet = yield new permission_model_1.default(permission).save();
    if (savedUser.userType !== "SuperAdmin") {
        const UserPreference = {
            userId: savedUser._id,
            userType: savedUser.userType,
            notificationPreference: true
        };
        const UserPreferenceSet = yield new userPreference_model_1.default(UserPreference).save();
    }
    //temporary disable due to no credentials
    if (userType === "FieldAgent" || userType === "Admin" || userType === "Finance") {
        const to = savedUser.email;
        const subject = "Welcome to Any Job - Your Login Credentials";
        const html = `Dear ${savedUser.firstName} ${savedUser.lastName}, your login credentials for AnyJob are: <b>Password: ${generatedPass}</b> or you can directly log in using your registered <b>Phone Number: ${savedUser.phone}</b>.`;
        yield (0, sendMail_1.sendMail)(to, subject, html);
    }
    //add as stripe customer
    if (userType === 'ServiceProvider' || userType === 'Customer') {
        yield (0, stripe_controller_1.createCustomerIfNotExists)((newUser._id).toString());
    }
    return savedUser;
});
exports.addUser = addUser;
const CheckJWTTokenExpiration = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.accessToken) || ((_b = req.header("Authorization")) === null || _b === void 0 ? void 0 : _b.replace("Bearer ", ""));
        console.log(token, "given token");
        if (!token) {
            console.log("Token is missing or empty");
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(401, "Unauthorized Request"));
        }
        const decoded = jsonwebtoken_1.default.decode(token);
        if (!decoded || !decoded.exp) {
            return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Invalid token or missing expiration"));
        }
        const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
        const remainingTimeInSeconds = decoded.exp - currentTime;
        // console.log(currentTime);
        if (remainingTimeInSeconds <= 0) {
            return res.status(200).json({ isExpired: true, remainingTimeInSeconds: 0 });
        }
        return res.status(200).json({ isExpired: false, remainingTimeInSeconds });
    }
    catch (error) {
        console.error("Error checking token expiration:", error.message);
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(500, "Internal Server Error"));
    }
});
exports.CheckJWTTokenExpiration = CheckJWTTokenExpiration;
function getCardType(cardNumber) {
    const cardInfo = card_validator_1.default.number(cardNumber);
    if (cardInfo.isPotentiallyValid && cardInfo.card) {
        return cardInfo.card.type; // Returns card type like 'visa', 'mastercard', etc.
    }
    return 'Unknown';
}
function isNotificationPreferenceOn(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        let isOn;
        const result = yield userPreference_model_1.default.findOne({ userId: new mongoose_1.default.Types.ObjectId(userId) }).select('notificationPreference');
        isOn = result === null || result === void 0 ? void 0 : result.notificationPreference;
        return isOn;
    });
}
;
