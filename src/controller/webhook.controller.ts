import { Request, Response } from "express";
import Stripe from "stripe";
import UserModel from "../models/user.model";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '../config/config'
import PurchaseModel from "../models/purchase.model";
const stripe = new Stripe(STRIPE_SECRET_KEY as string,);

export const stripeWebhook = async (req: Request, res: Response) => {
    
    const sig = req.headers["stripe-signature"] as string;

    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET!);
        // console.log("given event details==>", event);


        switch (event.type) {
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
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error("Webhook Error:", error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
}



//EVENT HANDLERS
const handleCustomerCreated = async (customer: any) => {
    console.log("New Customer Created:", customer.id);

    // Store customer ID in database
    await UserModel.findOneAndUpdate(
        { email: customer.email },
        { stripeCustomerId: customer.id },
        { new: true, upsert: true }
    );
};

const handlePaymentMethodAttached = async (paymentMethod: any) => {
    console.log("Payment Method Attached:", paymentMethod.id);

    await UserModel.findOneAndUpdate(
        { stripeCustomerId: paymentMethod.customer },
        { $push: { paymentMethods: paymentMethod.id } },
        { new: true }
    );
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
    console.log("Payment Successful:", paymentIntent.id);

    // Get receipt URL
    const charges = await stripe.charges.list({ payment_intent: paymentIntent.id });
    const receiptUrl = charges.data[0]?.receipt_url;

    await PurchaseModel.findOneAndUpdate(
        { stripeCustomerId: paymentIntent.customer, paymentIntentId: paymentIntent.id },
        { status: 'succeeded', receipt_url: receiptUrl, lastPendingPaymentIntentId: "" },
        { new: true }
    );


    console.log("Webhook runs: paymnet status updated :)");
    console.log("Receipt URL:", receiptUrl);
};

const handlePaymentDelayed = async (paymentIntent: any) => {
    console.log("Payment is being processed:", paymentIntent.id);

    await PurchaseModel.findOneAndUpdate(
        { stripeCustomerId: paymentIntent.customer, paymentIntentId: paymentIntent.id },
        { lastPendingPaymentIntentId: paymentIntent.id },
        { new: true }
    );
};

const handlePaymentCanceled = async (paymentIntent: any) => {
    console.log("Payment Canceled:", paymentIntent.id);

    await PurchaseModel.findOneAndUpdate(
        { stripeCustomerId: paymentIntent.customer, paymentIntentId: paymentIntent.id },
        { status: 'failed', lastPendingPaymentIntentId: "" },
        { new: true }
    );
};