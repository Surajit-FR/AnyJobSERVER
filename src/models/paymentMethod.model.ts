import mongoose, { Model, Schema } from "mongoose";
import { IPaymentMethodSchema } from "../../types/schemaTypes";


const PaymentMethodSchema: Schema<IPaymentMethodSchema> = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        paymentMethodId: { type: String, required: true },
        last4: { type: Number, required: true },
        brand: { type: String, required: true },
        exp_month: { type: Number, required: true },
        exp_year: { type: Number, required: true },
        is_default: { type: Boolean, required: true },
        isDeleted: { type: Boolean, default:false },
    },
    { timestamps: true }
);

const PaymentMethodModel: Model<IPaymentMethodSchema> = mongoose.model("PaymentMethod", PaymentMethodSchema);
export default PaymentMethodModel;