"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const validateUser = (userModel) => {
    const UserSchema = joi_1.default.object({
        firstName: joi_1.default.string().min(3).max(60).required().trim().messages({
            "string.empty": "First name is required!",
            "string.min": "Minimum length should be 3",
            "string.max": "Maximum length should be 60"
        }),
        lastName: joi_1.default.string().min(3).max(60).required().trim().messages({
            "string.empty": "Last name is required!",
            "string.min": "Minimum length should be 3",
            "string.max": "Maximum length should be 60"
        }),
        email: joi_1.default.string().email().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).required().lowercase().trim().messages({
            "string.empty": "Email Address is required",
            "string.email": "Invalid email format",
            "string.pattern.base": "Email must be a valid format"
        }),
        password: joi_1.default.string().required().messages({
            "string.empty": "Password is required"
        }),
        phone: joi_1.default.string()
            .pattern(/^[0-9]{10}$/)
            .optional()
            .messages({
            'string.pattern.base': 'Phone number must be a valid 10-digit number.',
            'string.empty': 'Phone number is required.',
            'any.required': 'Phone number is a required field.'
        }),
        coverImage: joi_1.default.string().optional().allow("").default(""),
        refreshToken: joi_1.default.string().optional().allow("").default(""),
        isDeleted: joi_1.default.boolean().default(false),
    }).unknown(true);
    return UserSchema.validate(userModel, { abortEarly: false });
};
exports.default = validateUser;
