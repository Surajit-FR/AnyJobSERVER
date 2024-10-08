"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const validateCategory = (categoryModel) => {
    const CategorySchema = joi_1.default.object({
        name: joi_1.default.string().min(1).max(1000).required().trim().messages({
            "string.empty": "Category name is required",
            "string.min": "Category name should be at least 1 character long",
            "string.max": "Category name should be at most 1000 characters long"
        }),
    });
    return CategorySchema.validate(categoryModel, { abortEarly: false });
};
exports.default = validateCategory;
