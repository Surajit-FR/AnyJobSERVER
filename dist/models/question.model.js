"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// Schema for Derived Questions (Recursive Structure)
const derivedQuestionSchema = new mongoose_1.Schema({
    option: { type: String, required: true },
    question: { type: String, required: true },
    options: {
        type: Map,
        of: String,
        required: true,
    },
    derivedQuestions: [this] // Recursively storing derived questions
});
// Main Question Schema
const questionSchema = new mongoose_1.Schema({
    categoryId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'Category' },
    subCategoryId: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'SubCategory' },
    question: { type: String, required: true },
    options: {
        type: Map,
        of: String,
        required: true,
    },
    derivedQuestions: [derivedQuestionSchema] // Storing derived questions within main question
});
// Create and export the Question model
const QuestionModel = (0, mongoose_1.model)('Question', questionSchema);
exports.default = QuestionModel;
