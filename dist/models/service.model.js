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
            ref: "shift",
            required: true
        }
        // required:  [true, "Service Shift Time is Required"]
    },
    serviceZipCode: {
        type: String,
        required: [true, "Service Zipcode is required"]
    },
    serviceLatitude: {
        type: String,
        required: [true, "Service Latitude is required"]
    },
    serviceLongitude: {
        type: String,
        required: [true, "Service Longitude is required"]
    },
    location: {
        type: {
            type: String, // Always 'Point'
            enum: ["Point"], // GeoJSON format
            required: true,
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
        },
    },
    isIncentiveGiven: {
        type: Boolean,
        default: false
    },
    startedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    incentiveAmount: {
        type: Number,
        default: 0,
    },
    isTipGiven: {
        type: Boolean,
        default: false
    },
    tipAmount: {
        type: Number,
        default: 0,
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
    serviceProviderId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "user",
        default: null
    },
    assignedAgentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "user",
        default: null
    }, //can be a tl or fieldAgent
    answerArray: [answerSchema],
    serviceProductImage: {
        type: String,
        default: ""
    },
    otherInfo: {
        type: {
            productSerialNumber: {
                type: String
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
    requestProgress: {
        type: String,
        enum: ["NotStarted", "Pending", "Started", "Completed", "Cancelled"],
        default: "NotStarted"
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
//adding geospatial index
ServiceSchema.index({ location: "2dsphere" });
const ServiceModel = mongoose_1.default.model('service', ServiceSchema);
exports.default = ServiceModel;
