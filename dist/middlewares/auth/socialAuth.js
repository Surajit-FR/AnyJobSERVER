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
exports.HandleSocialAuthError = void 0;
const user_model_1 = __importDefault(require("../../models/user.model"));
const asyncHandler_1 = require("../../utils/asyncHandler");
// HandleSocialAuthError
exports.HandleSocialAuthError = (0, asyncHandler_1.asyncHandler)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, uid, displayName, photoURL, phoneNumber } = req.body;
    try {
        // Check if all required fields are present
        if (!email || !uid || !displayName || !photoURL) {
            return res.status(400).send({
                success: false,
                message: 'Social login data is missing or incomplete!',
                key: 'social_login_data'
            });
        }
        ;
        let user;
        if (email) {
            user = yield user_model_1.default.findOne({ email: email });
        }
        else if (phoneNumber) {
            user = yield user_model_1.default.findOne({ phone: phoneNumber });
        }
        ;
        // If user exists, attach user object to the request and skip password check
        if (user) {
            // If user exists and is deleted, return appropriate response
            if (user.isDeleted === true) {
                return res.status(403).json({ success: false, message: 'Your account has been deleted. Please contact support for further assistance.', key: 'user' });
            }
            req.user = user;
            return next();
        }
        else {
            // If user doesn't exist, proceed to the next middleware/controller
            return next();
        }
    }
    catch (exc) {
        console.log(exc.message);
        return res.status(500).json({ success: false, message: "Something went wrong. Please try again.", error: exc.message });
    }
}));
