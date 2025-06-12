import { Request, Response } from "express";
import Stripe from "stripe";
import UserModel from "../models/user.model";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '../config/config'
import PurchaseModel from "../models/purchase.model";
import PaymentMethodModel from "../models/paymentMethod.model";
import WalletModel from "../models/wallet.model";
import CancellationFeeModel from "../models/cancellationFee.model";
import ServiceModel from "../models/service.model";
import mongoose from "mongoose";
const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
    apiVersion: '2024-09-30.acacia' as any,
});

export const stripeWebhook = async (req: Request, res: Response) => {
    console.log("webhook runs");


    const sig = req.headers["stripe-signature"] as string;

    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET!);
        // console.log("given event details==>", event);


        switch (event.type) {
            case "checkout.session.completed":
                await handleCheckoutSessionCompleted(event.data.object);
                break;

            case "customer.created":
                await handleCustomerCreated(event.data.object);
                break;

            case "payment_method.attached":
                await handlePaymentMethodAttached(event.data.object);
                break;

            case "payment_method.updated":
                await handlePaymentMethodUpdated(event.data.object);
                break;

            case "payment_method.detached":
                await handlePaymentMethodDeleted(event.data.object);
                break;

            case "payment_intent.succeeded":
                await handlePaymentSuccess(event.data.object);
                break;

            case "payment_intent.processing":
                await handlePaymentDelayed(event.data.object);
                break;

            case "payment_intent.canceled":
                await handlePaymentCanceled(event.data.object);
                break;

            case "transfer.created":
                await handleTransferCreated(event.data.object);
                break;

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
};


//EVENT HANDLERS
const handleCustomerCreated = async (customer: any) => {
    console.log("WEBHOOK RUNS: CUSTOMER CREATED");

    // Store customer ID in database
    await UserModel.findOneAndUpdate(
        { email: customer.email },
        { stripeCustomerId: customer.id },
        { new: true, upsert: true }
    );
};

const handlePaymentMethodAttached = async (paymentMethod: any) => {
    console.log("WEBHOOK RUNS: ATTATCH PAYMENT METHOD");

    // Attach the new payment method to the Stripe customer
    const attach = await stripe.paymentMethods.attach(paymentMethod.id, { customer: paymentMethod.customer });
    console.log("ATTATCH PAYMENT METHOD: ", attach);

    // Set the payment method as the default for future payments
    await stripe.customers.update(paymentMethod.customer, {
        invoice_settings: { default_payment_method: paymentMethod.id },
    });

    await UserModel.findOneAndUpdate(
        { stripeCustomerId: paymentMethod.customer },
        { paymentMethodId: paymentMethod.id },
        { new: true }
    );
    console.log("Payment Method Attached:", paymentMethod.id);
};

const handlePaymentMethodUpdated = async (paymentMethod: any) => {
    console.log("Payment Method Updated:", paymentMethod.id);

    // No direct update in database needed, but you may log or notify the user
};

const handlePaymentMethodDeleted = async (paymentMethod: any) => {
    console.log("Payment Method Deleted:", paymentMethod.id);

    await UserModel.findOneAndUpdate(
        { stripeCustomerId: paymentMethod.customer },
        { $pull: { paymentMethods: paymentMethod.id } }, // Remove from the array
        { new: true }
    );
};

const handlePaymentSuccess = async (paymentIntent: any) => {
    console.log("WEBHOOK RUNS: CHECKING PAYMENT SUCCESS");


    const charges = await stripe.charges.list({ payment_intent: paymentIntent.id });
    const receiptUrl = charges.data[0]?.receipt_url;
    const updatedPurchaseData = await PurchaseModel.findOne(
        { paymentIntentId: paymentIntent.id },
        // { status: 'succeeded', receipt_url: receiptUrl, lastPendingPaymentIntentId: "" },
        // { new: true }
    );
    console.log({ updatedPurchaseData });

    console.log("Webhook runs: paymnet status updated :)");
};

const handlePaymentDelayed = async (paymentIntent: any) => {
    console.log("WEBHOOK RUNS: CHECKING PAYMENT DELAY");

    await PurchaseModel.findOneAndUpdate(
        { stripeCustomerId: paymentIntent.customer, paymentIntentId: paymentIntent.id },
        { lastPendingPaymentIntentId: paymentIntent.id },
        { new: true }
    );
};

const handlePaymentCanceled = async (paymentIntent: any) => {
    console.log("WEBHOOK RUNS: CHECKING PAYMENT FALIURE");

    await PurchaseModel.findOneAndUpdate(
        { stripeCustomerId: paymentIntent.customer, paymentIntentId: paymentIntent.id },
        { status: 'failed', lastPendingPaymentIntentId: "" },
        { new: true }
    );
};

const handleCheckoutSessionCompleted = async (session: any) => {
    try {
        console.log("WEBHOOK RUNS: CHECKOUT SESSION ");

        const customerId = session.customer;
        const paymentIntentId = session.payment_intent;

        const purpose = session.metadata?.purpose;
        if (purpose === 'wallet_topup') {
            await handleWalletTopUp(session); //for sp
        }
        else if (purpose === 'leadGenerationFee') {
            await handleLeadGenerationFee(session); //for sp
        }
        else if (purpose === 'CancellationFee') {
            await handleServiceCancellationFee(session); //for customer
        }
        else {
            await handleServiceIncentivePayment(session); //for customer
        }

        if (!customerId || !paymentIntentId) {
            console.warn("Missing customer or payment_intent in session");
            return;
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId as string);
        const paymentMethodId = paymentIntent.payment_method as string;

        if (!paymentMethodId) {
            console.warn("No payment method found in payment intent");
            return;
        }
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

        const { brand, exp_month, exp_year, last4 } = paymentMethod.card || {};

        if (!last4 || !brand || !exp_month || !exp_year) {
            console.warn("Missing card details in payment method");
            return;
        }

        const user = await UserModel.findOneAndUpdate(
            { stripeCustomerId: customerId },
            { paymentMethodId: paymentMethodId },
            { new: true, upsert: true }
        );

        // Update the user's payment method record in the DB
        const payment_method_details = {
            userId: user?._id,
            stripeCustomerId: customerId,
            paymentMethodId: paymentMethodId,
            last4,
            brand,
            exp_month,
            exp_year,
        }
        const existingData = await PaymentMethodModel.findOne({ userId: user?._id, paymentMethodId: paymentMethodId });
        if (!existingData) {
            await new PaymentMethodModel(payment_method_details).save();
        }

        //create purchase details when user will initiate a payment intent
        const purchaseData = {
            userId: user?._id,
            serviceId: session.metadata.serviceId,
            paymentMethodId: user?.paymentMethodId,
            paymentMethodDetails: payment_method_details,

            stripeCustomerId: paymentIntent?.customer,
            paymentIntentId: paymentIntent?.id,
            status: session.status === "complete" ? "succeeded" : "failed",
            currency: "usd",
            amount: Math.ceil(session.amount_total / 100),
        }
        const savePurchaseData = await new PurchaseModel(purchaseData).save();
    } catch (err) {
        console.error("❌ Error in handleCheckoutSessionCompleted:", err);
    }
};

const handleServiceIncentivePayment = async (session: any) => {
    try {
        console.log("WEBHOOK RUNS: SERVICE INCENTIVE CHECKOUT SESSION ");

        const customerId = session.customer;
        const paymentIntentId = session.payment_intent;

        if (!customerId || !paymentIntentId) {
            console.warn("Missing customer or payment_intent in session");
            return;
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId as string);
        const paymentMethodId = paymentIntent.payment_method as string;

        if (!paymentMethodId) {
            console.warn("No payment method found in payment intent");
            return;
        }
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

        const { brand, exp_month, exp_year, last4 } = paymentMethod.card || {};

        if (!last4 || !brand || !exp_month || !exp_year) {
            console.warn("Missing card details in payment method");
            return;
        }

        const user = await UserModel.findOneAndUpdate(
            { stripeCustomerId: customerId },
            { paymentMethodId: paymentMethodId },
            { new: true, upsert: true }
        );

        // Update the user's payment method record in the DB
        const payment_method_details = {
            userId: user?._id,
            stripeCustomerId: customerId,
            paymentMethodId: paymentMethodId,
            last4,
            brand,
            exp_month,
            exp_year,
        }
        const existingData = await PaymentMethodModel.findOne({ userId: user?._id, paymentMethodId: paymentMethodId });
        if (!existingData) {
            await new PaymentMethodModel(payment_method_details).save();
        }

        //create purchase details when user will initiate a payment intent
        const purchaseData = {
            userId: user?._id,
            serviceId: session.metadata.serviceId,
            paymentMethodId: user?.paymentMethodId,
            paymentMethodDetails: payment_method_details,

            stripeCustomerId: paymentIntent?.customer,
            paymentIntentId: paymentIntent?.id,
            status: session.status === "complete" ? "succeeded" : "failed",
            currency: "usd",
            amount: Math.ceil(session.amount_total / 100),
        }
        const savePurchaseData = await new PurchaseModel(purchaseData).save();

    } catch (error: any) {
        console.error("❌ Error in handleCheckoutSessionCompleted:", error);
    }
};

const handleWalletTopUp = async (session: any) => {
    console.log("WEBHOOK RUNS: WALLET ADD FUND CHECKOUT SESSION ");

    const customerId = session.customer;
    const amount = session.amount_total / 100;

    const user = await UserModel.findOne({ stripeCustomerId: customerId });
    const wallet = await WalletModel.findOne({ userId: user?._id });
    if (!user || !wallet) {
        console.log("User or wallet not found for customerId:", customerId);
        return;
    }

    const transfer = await stripe.transfers.create({
        amount: session.amount_total,
        currency: 'usd',
        destination: wallet.stripeConnectedAccountId,
    });

    const transaction = {
        type: 'credit',
        amount,
        description: 'AddMoney',
        stripeTransactionId: transfer.id,
    };

    await WalletModel.findOneAndUpdate(
        { userId: user._id },
        {
            $push: { transactions: transaction },
            $inc: { balance: amount },
            updatedAt: Date.now(),
        }
    );
};

const handleLeadGenerationFee = async (session: any) => {
    try {
        console.log("WEBHOOK RUNS: LEAD GENERATION FEE CHECKOUT SESSION ");

        const purpose = session.metadata?.purpose;
        if (purpose !== 'leadGenerationFee') return;

        const userId = session.metadata?.userId;
        const serviceId = session.metadata?.serviceId;

        const user = await UserModel.findById(userId);
        if (!user) {
            console.warn("User not found in leadgenerationfee webhook");
            return;
        }

        const wallet = await WalletModel.findOne({ userId });
        if (!wallet) {
            console.warn("Wallet not found for user in leadgenerationfee webhook");
            return;
        }

        const amount = session.amount_total / 100;

        // Transfer funds from platform to itself (simulating)
        const platformAccount = await stripe.accounts.retrieve();

        const transfer = await stripe.transfers.create({
            amount: session.amount_total,
            currency: 'usd',
            destination: platformAccount.id,
        }, {
            stripeAccount: wallet.stripeConnectedAccountId,
        });

        const transaction = {
            type: 'debit',
            amount,
            description: 'LeadGenerationFee',
            serviceId,
            stripeTransactionId: transfer.id,
        };

        await WalletModel.findOneAndUpdate(
            { userId },
            {
                $push: { transactions: transaction },
                $inc: { balance: -amount },
                updatedAt: Date.now(),
            }
        );
    } catch (error: any) {
        console.error("❌ Error in handleCheckoutSessionCompleted (Lead Generation Fee):", error);
    }
};

const handleServiceCancellationFee = async (session: any) => {
    try {

        console.log("WEBHOOK RUNS: SERVICE CANCELLATION FEE CHECKOUT SESSION ", session);

        const purpose = session.metadata?.purpose;
        if (purpose !== 'CancellationFee') return;

        const userId = session.metadata?.userId;
        const serviceId = session.metadata?.serviceId;
        const cancellationReason = session.metadata?.cancellationReason;

        const user = await UserModel.findById(userId);
        if (!user) {
            console.warn("User not found in leadgenerationfee webhook");
            return;
        }

        const paymentIntentId = session.payment_intent;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId as string);
        const paymentMethodId = paymentIntent.payment_method as string;

        if (!paymentMethodId) {
            console.warn("No payment method found in payment intent");
            return;
        }
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        const customerId = session.customer;


        const { brand, exp_month, exp_year, last4 } = paymentMethod.card || {};

        if (!last4 || !brand || !exp_month || !exp_year) {
            console.warn("Missing card details in payment method");
            return;
        };

        // Update the user's payment method record in the DB
        const payment_method_details = {
            userId: user?._id,
            stripeCustomerId: customerId,
            paymentMethodId: paymentMethodId,
            last4,
            brand,
            exp_month,
            exp_year,
        }

        //create purchase details when user will initiate a payment intent
        const CancellationFeeData = {
            userId: user?._id,
            serviceId: session.metadata.serviceId,
            paymentMethodId: user?.paymentMethodId,
            paymentMethodDetails: payment_method_details,

            stripeCustomerId: paymentIntent?.customer,
            paymentIntentId: paymentIntent?.id,
            status: session.status === "complete" ? "succeeded" : "failed",
            currency: "usd",
            amount: Math.ceil(session.amount_total / 100),
        }
        const saveCancellationFee = await new CancellationFeeModel(CancellationFeeData).save();
        //cancel the service
        const updatedService = await ServiceModel.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(serviceId), userId: user._id },
            {
                $set: {
                    requestProgress: "Blocked",
                    cancelledBy: user._id,
                    cancellationReason: cancellationReason,
                    serviceProviderId: null,
                    assignedAgentId: null
                }
            }, { new: true }
        );
    } catch (error: any) {
        console.error("❌ Error in handleCheckoutSessionCompleted (Lead Generation Fee):", error);
    }
};

const handleTransferCreated = async (transfer: any) => {
    try {
        console.log("🔥 Transfer Created Event:", transfer);

        const purpose = transfer.metadata?.purpose;
        const SPId = transfer.metadata?.SPId;
        if (purpose === 'CancellationFee') {

            const stripeTransferId = transfer.id;
            const amount = transfer.amount / 100; // Convert to dollars
            // Save transfer details to database
            const transaction = {
                type: 'credit',
                amount,
                description: 'ServiceCancellationAmount',
                stripeTransferId
            };

            await WalletModel.findOneAndUpdate(
                { userId: SPId },
                {
                    $push: { transactions: transaction },
                    $inc: { balance: amount },
                    updatedAt: Date.now(),
                }
            );

            console.log("✅ Cancellation amount for SP transferd to his account successfully");
        }

    } catch (error: any) {
        console.error("❌ Error in handleTransferCreated:", error.message);
    }
}