"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const walletSchema = new mongoose_1.default.Schema({
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    stripeConnectedAccountId: {
        type: String,
        required: true,
        unique: true,
    },
    balance: {
        type: Number,
        default: 0, // Amount in dollars
    },
    currency: {
        type: String,
        default: 'usd',
    },
    transactions: [
        {
            type: {
                type: String, // 'credit' | 'debit'
                enum: ['credit', 'debit'],
            },
            amount: Number,
            description: { type: String, enum: ['AddMoney', 'LeadGenerationFee'] },
            serviceId: mongoose_1.default.Schema.Types.ObjectId,
            date: {
                type: Date,
                default: Date.now,
            },
            stripeTransactionId: String,
        },
    ],
}, { timestamps: true });
const WalletModel = mongoose_1.default.model('Wallet', walletSchema);
exports.default = WalletModel;
