import mongoose from "mongoose";

const adminRevenueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
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
    serviceId: mongoose.Schema.Types.ObjectId,
    date: {
      type: Date,
      default: Date.now,
    },
    stripeTransactionId: String,
    stripeTransferId: String,
  },
  { timestamps: true }
);

const AdminRevenueModel = mongoose.model("AdminRevenue", adminRevenueSchema);
export default AdminRevenueModel;
