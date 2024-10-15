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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// Schema for Derived Answer (Recursive)
const derivedAnswerSchema = new mongoose_1.Schema({
    option: { type: String, required: true },
    answer: { type: String, required: true },
    derivedAnswers: [this] // Recursive structure to hold derived answers
});
// Schema for Main Answer
const answerSchema = new mongoose_1.Schema({
    answer: { type: String, required: true },
    selectedOption: { type: String, required: true },
    derivedAnswers: [derivedAnswerSchema] // Derived answers are nested here
});
const ServiceSchema = new mongoose_1.Schema({
    categoryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "category",
        required: [true, "Category Id is Required"]
    },
    subCategoryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "subcategory",
        required: [true, "Category Id is Required"]
    },
    serviceStartDate: {
        type: Date,
        required: [true, "Service Start Date is Required"]
    },
    serviceShifftId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "shift",
        required: [true, "Service Shift is Required"]
    },
    SelectedShiftTime: {
        shiftId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "shift",
            required: [true, "Service Shift is Required"]
        },
        shiftTimeId: {
            type: mongoose_1.Schema.Types.ObjectId,
            required: true
        }
        // required:  [true, "Service Shift Time is Required"]
    },
    serviceZipCode: {
        type: Number
    },
    serviceLatitude: {
        type: Number,
        required: [true, "Service Latitude is required"]
    },
    serviceLongitude: {
        type: Number,
        required: [true, "Service Longitude is required"]
    },
    isIncentiveGiven: {
        type: Boolean,
        default: false
    },
    incentiveAmount: {
        type: Number,
        default: 0,
        min: 10
    },
    isApproved: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
    isReqAcceptedByServiceProvider: {
        type: Boolean,
        default: false
    },
    // Answer array to store answers and derived answers
    answerArray: [answerSchema],
    serviceProductImage: {
        type: String,
        default: ""
    },
    otherInfo: {
        type: {
            productSerialNumber: {
                type: Number
            },
            serviceDescription: {
                type: String
            }
        }
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "user"
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
const ServiceModel = mongoose_1.default.model('Service', ServiceSchema);
exports.default = ServiceModel;
