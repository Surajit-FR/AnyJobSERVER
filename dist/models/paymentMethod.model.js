"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const PaymentMethodSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", required: false },
    paymentMethodId: { type: String, required: true },
    stripeCustomerId: { type: String, required: true },
    last4: { type: String, required: true },
    brand: { type: String, required: true },
    exp_month: { type: Number, required: true },
    exp_year: { type: Number, required: true },
    is_default: { type: Boolean, required: false },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
const PaymentMethodModel = mongoose_1.default.model("PaymentMethod", PaymentMethodSchema);
exports.default = PaymentMethodModel;
