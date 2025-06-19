"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const adminRevenueSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    type: {
        type: String, // 'credit' | 'debit'
        enum: ["credit", "debit"],
    },
    currency: {
        type: String,
        default: "usd",
    },
    amount: Number,
    description: {
        type: String,
        enum: [
            "AddMoney",
            "LeadGenerationFee",
            "WithdrawFund",
            "ServiceCancellationAmount",
            "ServiceIncentiveAmount",
        ],
    },
    serviceId: mongoose_1.default.Schema.Types.ObjectId,
    date: {
        type: Date,
        default: Date.now,
    },
    stripeTransactionId: String,
    stripeTransferId: String,
}, { timestamps: true });
const AdminRevenueModel = mongoose_1.default.model("AdminRevenue", adminRevenueSchema);
exports.default = AdminRevenueModel;
