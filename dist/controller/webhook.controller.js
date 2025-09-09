"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const stripe_1 = __importDefault(require("stripe"));
const user_model_1 = __importDefault(require("../models/user.model"));
const config_1 = require("../config/config");
const purchase_model_1 = __importDefault(require("../models/purchase.model"));
const paymentMethod_model_1 = __importDefault(require("../models/paymentMethod.model"));
const wallet_model_1 = __importDefault(require("../models/wallet.model"));
const cancellationFee_model_1 = __importDefault(require("../models/cancellationFee.model"));
const service_model_1 = __importDefault(require("../models/service.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const adminRevenue_model_1 = __importDefault(require("../models/adminRevenue.model"));
const stripe = new stripe_1.default(config_1.STRIPE_SECRET_KEY, {
    apiVersion: "2024-09-30.acacia",
});
const stripeWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("webhook runs");
    const sig = req.headers["stripe-signature"];
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, config_1.STRIPE_WEBHOOK_SECRET);
        // console.log("given event details==>", event);
        switch (event.type) {
            case "checkout.session.completed":
                yield handleCheckoutSessionCompleted(event.data.object);
                break;
            case "customer.created":
                yield handleCustomerCreated(event.data.object);
                break;
            case "payment_method.attached":
                yield handlePaymentMethodAttached(event.data.object);
                break;
            case "payment_method.updated":
                yield handlePaymentMethodUpdated(event.data.object);
                break;
            case "payment_method.detached":
                yield handlePaymentMethodDeleted(event.data.object);
                break;
            case "payment_intent.succeeded":
                yield handlePaymentSuccess(event.data.object);
                break;
            case "payment_intent.processing":
                yield handlePaymentDelayed(event.data.object);
                break;
            case "payment_intent.canceled":
                yield handlePaymentCanceled(event.data.object);
                break;
            case "transfer.created":
                yield handleTransferCreated(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error("Webhook Error:", error.message);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
exports.stripeWebhook = stripeWebhook;
//EVENT HANDLERS
const handleCustomerCreated = (customer) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("WEBHOOK RUNS: CUSTOMER CREATED", customer);
        const userType = customer.metadata.appUserType;
        const email = customer.email;
        // Store customer ID in database
        yield user_model_1.default.findOneAndUpdate({ email, userType }, { stripeCustomerId: customer.id }, { new: true, upsert: true });
    }
    catch (err) {
        console.error("❌ Error in handleCustomerCreated:", err);
        throw err;
        // return new ApiError(400, "Something went wrong,please try again later");
    }
});
const handlePaymentMethodAttached = (paymentMethod) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("WEBHOOK RUNS: ATTATCH PAYMENT METHOD");
        // Attach the new payment method to the Stripe customer
        const attach = yield stripe.paymentMethods.attach(paymentMethod.id, {
            customer: paymentMethod.customer,
        });
        console.log("ATTATCH PAYMENT METHOD: ", attach);
        // Set the payment method as the default for future payments
        yield stripe.customers.update(paymentMethod.customer, {
            invoice_settings: { default_payment_method: paymentMethod.id },
        });
        yield user_model_1.default.findOneAndUpdate({ stripeCustomerId: paymentMethod.customer }, { paymentMethodId: paymentMethod.id }, { new: true });
        console.log("Payment Method Attached:", paymentMethod.id);
    }
    catch (err) {
        console.error("❌ Error in handlePaymentMethodAttached:", err);
        throw err;
    }
});
const handlePaymentMethodUpdated = (paymentMethod) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Payment Method Updated:", paymentMethod.id);
    // No direct update in database needed, but you may log or notify the user
});
const handlePaymentMethodDeleted = (paymentMethod) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Payment Method Deleted:", paymentMethod.id);
        yield user_model_1.default.findOneAndUpdate({ stripeCustomerId: paymentMethod.customer }, { $pull: { paymentMethods: paymentMethod.id } }, // Remove from the array
        { new: true });
    }
    catch (err) {
        console.error("❌ Error in handlePaymentSuccess:", err);
        throw err;
    }
});
const handlePaymentSuccess = (paymentIntent) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("WEBHOOK RUNS: CHECKING PAYMENT SUCCESS");
        const charges = yield stripe.charges.list({
            payment_intent: paymentIntent.id,
        });
        console.log("Webhook runs: paymnet status updated :)");
    }
    catch (err) {
        console.error("❌ Error in handlePaymentSuccess:", err);
        throw err;
    }
});
const handlePaymentDelayed = (paymentIntent) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("WEBHOOK RUNS: CHECKING PAYMENT DELAY");
        yield purchase_model_1.default.findOneAndUpdate({
            stripeCustomerId: paymentIntent.customer,
            paymentIntentId: paymentIntent.id,
        }, { lastPendingPaymentIntentId: paymentIntent.id }, { new: true });
    }
    catch (err) {
        console.error("❌ Error in handlePaymentDelayed:", err);
        throw err;
    }
});
const handlePaymentCanceled = (paymentIntent) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("WEBHOOK RUNS: CHECKING PAYMENT FALIURE");
        yield purchase_model_1.default.findOneAndUpdate({
            stripeCustomerId: paymentIntent.customer,
            paymentIntentId: paymentIntent.id,
        }, { status: "failed", lastPendingPaymentIntentId: "" }, { new: true });
    }
    catch (err) {
        console.error("❌ Error in handlePaymentCanceled:", err);
        throw err;
    }
});
const handleCheckoutSessionCompleted = (session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log("WEBHOOK RUNS: CHECKOUT SESSION ");
        const customerId = session.customer;
        const paymentIntentId = session.payment_intent;
        const purpose = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.purpose;
        console.log("handleCheckoutSessionCompleted", purpose);
        if (purpose === "wallet_topup") {
            yield handleWalletTopUp(session); //for sp
        }
        else if (purpose === "leadGenerationFee") {
            yield handleLeadGenerationFee(session); //for sp
        }
        else if (purpose === "CancellationFee") {
            yield handleServiceCancellationFee(session); //for customer
        }
        else {
            yield handleServiceIncentivePayment(session); //for customer
        }
        if (!customerId || !paymentIntentId) {
            console.warn("Missing customer or payment_intent in session");
            return;
        }
        const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
        const paymentMethodId = paymentIntent.payment_method;
        if (!paymentMethodId) {
            console.warn("No payment method found in payment intent");
            return;
        }
        const paymentMethod = yield stripe.paymentMethods.retrieve(paymentMethodId);
        const { brand, exp_month, exp_year, last4 } = paymentMethod.card || {};
        if (!last4 || !brand || !exp_month || !exp_year) {
            console.warn("Missing card details in payment method");
            return;
        }
        const user = yield user_model_1.default.findOneAndUpdate({ stripeCustomerId: customerId }, { paymentMethodId: paymentMethodId }, { new: true, upsert: true });
        // Update the user's payment method record in the DB
        // const payment_method_details = {
        //   userId: user?._id,
        //   stripeCustomerId: customerId,
        //   paymentMethodId: paymentMethodId,
        //   last4,
        //   brand,
        //   exp_month,
        //   exp_year,
        // };
        // const existingData = await PaymentMethodModel.findOne({
        //   userId: user?._id,
        //   paymentMethodId: paymentMethodId,
        // });
        // if (!existingData) {
        //   await new PaymentMethodModel(payment_method_details).save();
        // }
        // //create purchase details when user will initiate a payment intent
        // const purchaseData = {
        //   userId: user?._id,
        //   serviceId: session.metadata.serviceId,
        //   paymentMethodId: user?.paymentMethodId,
        //   paymentMethodDetails: payment_method_details,
        //   stripeCustomerId: paymentIntent?.customer,
        //   paymentIntentId: paymentIntent?.id,
        //   status: session.status === "complete" ? "succeeded" : "failed",
        //   currency: "usd",
        //   amount: Math.ceil(session.amount_total / 100),
        // };
        // const savePurchaseData = await new PurchaseModel(purchaseData).save();
    }
    catch (err) {
        console.error("❌ Error in handleCheckoutSessionCompleted:", err);
        throw err;
    }
});
const handleServiceIncentivePayment = (session) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("WEBHOOK RUNS: SERVICE INCENTIVE CHECKOUT SESSION ");
        const customerId = session.customer;
        const paymentIntentId = session.payment_intent;
        if (!customerId || !paymentIntentId) {
            console.warn("Missing customer or payment_intent in session");
            return;
        }
        const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
        const paymentMethodId = paymentIntent.payment_method;
        if (!paymentMethodId) {
            console.warn("No payment method found in payment intent");
            return;
        }
        const paymentMethod = yield stripe.paymentMethods.retrieve(paymentMethodId);
        const { brand, exp_month, exp_year, last4 } = paymentMethod.card || {};
        if (!last4 || !brand || !exp_month || !exp_year) {
            console.warn("Missing card details in payment method");
            return;
        }
        const user = yield user_model_1.default.findOneAndUpdate({ stripeCustomerId: customerId }, { paymentMethodId: paymentMethodId }, { new: true, upsert: true });
        // Update the user's payment method record in the DB
        const payment_method_details = {
            userId: user === null || user === void 0 ? void 0 : user._id,
            stripeCustomerId: customerId,
            paymentMethodId: paymentMethodId,
            last4,
            brand,
            exp_month,
            exp_year,
        };
        const existingData = yield paymentMethod_model_1.default.findOne({
            userId: user === null || user === void 0 ? void 0 : user._id,
            paymentMethodId: paymentMethodId,
        });
        if (!existingData) {
            yield new paymentMethod_model_1.default(payment_method_details).save();
        }
        //create purchase details when user will initiate a payment intent
        const purchaseData = {
            userId: user === null || user === void 0 ? void 0 : user._id,
            serviceId: session.metadata.serviceId,
            paymentMethodId: user === null || user === void 0 ? void 0 : user.paymentMethodId,
            paymentMethodDetails: payment_method_details,
            stripeCustomerId: paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.customer,
            paymentIntentId: paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.id,
            status: session.status === "complete" ? "succeeded" : "failed",
            currency: "usd",
            amount: Math.ceil(session.amount_total / 100),
        };
        const savePurchaseData = yield new purchase_model_1.default(purchaseData).save();
        // const updatedService = await ServiceModel.findOneAndUpdate(
        //   {
        //     _id: session.metadata.serviceId,
        //     userId: user?._id,
        //   },
        //   {
        //     isIncentiveGiven: true,
        //     incentiveAmount: Math.ceil(session.amount_total / 100),
        //   },
        //   { new: true }
        // );
    }
    catch (error) {
        console.error("❌ Error in handleServiceIncentivePayment:", error);
        throw error;
    }
});
//when add fund is initiated
const handleWalletTopUp = (session) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("WEBHOOK RUNS: WALLET ADD FUND CHECKOUT SESSION ", session);
        const customerId = session.customer;
        const amount = session.amount_total / 100;
        const user = yield user_model_1.default.findOne({ stripeCustomerId: customerId });
        const wallet = yield wallet_model_1.default.findOne({ userId: user === null || user === void 0 ? void 0 : user._id });
        if (!user || !wallet) {
            console.log("User or wallet not found for customerId:", customerId);
            return;
        }
        // transfer added wallet amount in sp's wallet---------------------------------
        const transfer = yield stripe.transfers.create({
            amount: session.amount_total,
            currency: "usd",
            destination: wallet.stripeConnectedAccountId,
        });
        // -----------------------------------------------------------------------------
        // Update the wallet after successful add money (wallet credited)----------------
        const transaction = {
            type: "credit",
            amount,
            description: "AddMoney",
            stripeTransactionId: transfer.id,
        };
        yield wallet_model_1.default.findOneAndUpdate({ userId: user._id }, {
            $push: { transactions: transaction },
            $inc: { balance: amount },
            updatedAt: Date.now(),
        });
    }
    catch (err) {
        console.error("❌ Error in handleWalletTopUp:", err);
        throw err;
    }
});
// wallet update complete-------------------------------------------------------------
const handleLeadGenerationFee = (session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        console.log("WEBHOOK RUNS: LEAD GENERATION FEE CHECKOUT SESSION ", session);
        const purpose = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.purpose;
        if (purpose !== "leadGenerationFee")
            return;
        const userId = (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.userId;
        const serviceId = (_c = session.metadata) === null || _c === void 0 ? void 0 : _c.serviceId;
        const user = yield user_model_1.default.findById(userId);
        if (!user) {
            console.warn("User not found in leadgenerationfee webhook");
            return;
        }
        // Update wallet against successfull lead generaion fee payment---------------------------
        const wallet = yield wallet_model_1.default.findOne({ userId });
        if (!wallet) {
            console.warn("Wallet not found for user in leadgenerationfee webhook");
            return;
        }
        const amount = session.amount_total / 100;
        // Transfer funds from platform to itself (simulating)
        const platformAccount = yield stripe.accounts.retrieve();
        const transfer = yield stripe.transfers.create({
            amount: session.amount_total,
            currency: "usd",
            destination: platformAccount.id,
        }, {
            stripeAccount: wallet.stripeConnectedAccountId,
        });
        const transaction = {
            type: "debit",
            amount,
            description: "LeadGenerationFee",
            serviceId,
            stripeTransactionId: transfer.id,
        };
        yield wallet_model_1.default.findOneAndUpdate({ userId }, {
            $push: { transactions: transaction },
            $inc: { balance: -amount },
            updatedAt: Date.now(),
        });
        // -----------------------------------------------------------------------------------------
    }
    catch (error) {
        console.error("❌ Error in handleLeadGenerationFee (Lead Generation Fee):", error);
        throw error;
    }
});
const handleServiceCancellationFee = (session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        console.log("WEBHOOK RUNS: SERVICE CANCELLATION FEE CHECKOUT SESSION ", session);
        const purpose = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.purpose;
        if (purpose !== "CancellationFee")
            return;
        const userId = (_b = session.metadata) === null || _b === void 0 ? void 0 : _b.userId;
        const serviceId = (_c = session.metadata) === null || _c === void 0 ? void 0 : _c.serviceId;
        const cancellationReason = (_d = session.metadata) === null || _d === void 0 ? void 0 : _d.cancellationReason;
        const SPAmount = (_e = session.metadata) === null || _e === void 0 ? void 0 : _e.SPAmount;
        const SPStripeAccountId = (_f = session.metadata) === null || _f === void 0 ? void 0 : _f.SPStripeAccountId;
        const SPId = (_g = session.metadata) === null || _g === void 0 ? void 0 : _g.SPId;
        const user = yield user_model_1.default.findById(userId);
        if (!user) {
            console.warn("User not found in leadgenerationfee webhook");
            return;
        }
        //transfer cancellation amount to sp ----------------------------------------------------------------
        const transfer = yield stripe.transfers.create({
            amount: SPAmount * 100,
            description: `cancellationfee_transfer_to_sp_${SPId === null || SPId === void 0 ? void 0 : SPId.toString()}_for_service_${serviceId}`,
            currency: "usd",
            destination: SPStripeAccountId,
            transfer_group: `cancellation_fee_sp_${SPId === null || SPId === void 0 ? void 0 : SPId.toString()}_service_${serviceId}`,
        });
        console.log({ cancellationfee_transfer_to_sp: transfer });
        // ------------------------------------------------------------------------------------------------------
        // Update payment method details-------------------------------------------------------------------------
        const paymentIntentId = session.payment_intent;
        const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
        const paymentMethodId = paymentIntent.payment_method;
        if (!paymentMethodId) {
            console.warn("No payment method found in payment intent");
            return;
        }
        const paymentMethod = yield stripe.paymentMethods.retrieve(paymentMethodId);
        const customerId = session.customer;
        const { brand, exp_month, exp_year, last4 } = paymentMethod.card || {};
        if (!last4 || !brand || !exp_month || !exp_year) {
            console.warn("Missing card details in payment method");
            return;
        }
        // Update the user's payment method record in the DB
        const payment_method_details = {
            userId: user === null || user === void 0 ? void 0 : user._id,
            stripeCustomerId: customerId,
            paymentMethodId: paymentMethodId,
            last4,
            brand,
            exp_month,
            exp_year,
        };
        // -------------------------------------------------------------------------------------------------------
        //create cancellation record for customer-----------------------------------------------------------------
        const CancellationFeeData = {
            userId: user === null || user === void 0 ? void 0 : user._id,
            serviceId: session.metadata.serviceId,
            paymentMethodId: user === null || user === void 0 ? void 0 : user.paymentMethodId,
            paymentMethodDetails: payment_method_details,
            stripeCustomerId: paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.customer,
            paymentIntentId: paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.id,
            status: session.status === "complete" ? "succeeded" : "failed",
            currency: "usd",
            amount: Math.ceil(session.amount_total / 100),
        };
        const saveCancellationFee = yield new cancellationFee_model_1.default(CancellationFeeData).save();
        // ---------------------------------------------------------------------------------------------------------
        // After successfully saved the related data finally cancel the service by customer's side------------------
        const updatedService = yield service_model_1.default.findOneAndUpdate({ _id: new mongoose_1.default.Types.ObjectId(serviceId), userId: user._id }, {
            $set: {
                requestProgress: "Blocked",
                cancelledBy: user._id,
                cancellationReason: cancellationReason,
                serviceProviderId: null,
                assignedAgentId: null,
            },
        }, { new: true });
        // ---------------------------------------------------------------------------------------------------------
        // Create a record for admin revenue as some amt of cancellation will be credited to admin'a account--------
        const transaction = {
            userId: user._id,
            type: "credit",
            amount: (session.amount_total / 100) * 0.25,
            description: "ServiceCancellationAmount",
            stripeTransactionId: paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.id,
            serviceId: session.metadata.serviceId,
        };
        yield new adminRevenue_model_1.default(transaction).save();
        // -----------------------------------------------------------------------------------------------------------
    }
    catch (error) {
        console.error("❌ Error in handleServiceCancellationFee (Lead Generation Fee):", error);
        throw error;
    }
});
const handleTransferCreated = (transfer) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Transfer Created Event:", transfer);
        const amount = transfer.amount / 100;
        const stripeTransferId = transfer.id;
        const transferGroup = transfer.transfer_group;
        if (!transferGroup) {
            console.warn("Transfer group missing in transfer event.");
            return;
        }
        let description = "";
        let SPId = "";
        console.log({ transferGroup });
        if (transferGroup.startsWith("cancellation_fee_sp_")) {
            description = "ServiceCancellationAmount";
            const parts = transferGroup.split("_");
            console.log("parts", parts);
            SPId = parts[3]; // Extract SPId
        }
        else if (transferGroup.startsWith("incentive_fee_")) {
            description = "ServiceIncentiveAmount";
            const parts = transferGroup.split("_");
            console.log("parts", parts);
            SPId = parts[2]; // Extract SPId
        }
        else {
            console.warn("Unhandled transfer group:", transferGroup);
            return;
        }
        if (!SPId) {
            console.error("Service Provider ID not found in transfer group.");
            return;
        }
        console.log({ SPId });
        const transaction = {
            type: "credit",
            amount,
            description,
            stripeTransferId,
        };
        const updateResult = yield wallet_model_1.default.findOneAndUpdate({ userId: new mongoose_1.default.Types.ObjectId(SPId) }, {
            $push: { transactions: transaction },
            $inc: { balance: amount },
            updatedAt: Date.now(),
        }, { new: true });
        if (updateResult) {
            console.log(`${description} transferred to SP's account successfully.`);
        }
        else {
            console.warn(`Wallet not found for SP ID: ${SPId}`);
        }
    }
    catch (error) {
        console.error("Error in handleTransferCreated:", error.message);
        throw error;
    }
});
