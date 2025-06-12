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
const PurchaseSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    serviceId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Service", required: false },
    paymentMethodId: { type: String, required: true },
    paymentMethodDetails: {
        type: {
            userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: false },
            paymentMethodId: { type: String, required: true },
            stripeCustomerId: { type: String, required: true },
            last4: { type: String, required: true },
            brand: { type: String, required: true },
            exp_month: { type: Number, required: true },
            exp_year: { type: Number, required: true },
        },
    },
    stripeCustomerId: { type: String, required: true },
    lastPendingPaymentIntentId: { type: String },
    paymentIntentId: { type: String, required: true },
    currency: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "succeeded", "failed"], default: "pending" },
    // receipt_url: { type: String, default: null },
}, { timestamps: true });
const PurchaseModel = mongoose_1.default.model("Purchase", PurchaseSchema);
exports.default = PurchaseModel;
