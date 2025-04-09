import { Request, Response } from 'express';
import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from '../config/config';
import UserModel from '../models/user.model';
import mongoose from 'mongoose';
import PurchaseModel from '../models/purchase.model';
import PaymentMethodModel from '../models/paymentMethod.model';

const stripe = new Stripe(STRIPE_SECRET_KEY);


export const createCustomerIfNotExists = async (req: Request, res: Response) => {
    try {

        const { userId } = req.body
        const user = await UserModel.findById({ _id: userId });

        if (!user) throw new Error("User not found");

        if (user.stripeCustomerId) {
            return res.status(200).json({ success: true, message: "Stripe customer already exist", customerId: user.stripeCustomerId });
        }

        const customer = await stripe.customers.create({
            email: user.email,
            name: user.firstName + ' ' + user.lastName || 'default',
        });

        await UserModel.findByIdAndUpdate({ _id: userId }, { stripeCustomerId: customer.id });

        // return customer.id;
        return res.status(200).json({ success: true, message: "Stripe customer created successfully", customerId: customer.id });

    } catch (error) {
        console.error("Error creating Stripe customer:", error);
        throw error;
    }
};

export const attatchPaymentMethod = async (req: Request, res: Response) => {
    try {
        const { userId, paymentMethodId, last4, brand, exp_month, exp_year, } = req.body;
        console.log({ paymentMethodId });


        if (!userId || !paymentMethodId) {
            return res.status(400).json({ success: false, message: "userId and paymentMethodId are required" });
        }

        // Fetch user from the database
        const user = await UserModel.findById({ _id: userId });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.stripeCustomerId || user.paymentMethodId) {
            return res.status(200).json({ success: true, message: "User has already a saved payement method " });
        }

        const customer = await stripe.customers.create({
            email: user.email,
            name: user.firstName + ' ' + user.lastName || 'default',
        });
        console.log({ customer });


        const newPaymentMethod = {
            userId: userId,
            paymentMethodId: paymentMethodId,
            last4: last4,
            brand: brand,
            exp_month: exp_month,
            exp_year: exp_year,
            is_default: true,
        };

        const saveMethodInDB = await new PaymentMethodModel(newPaymentMethod).save()

        // Attach the new payment method to the Stripe customer
        const attach = await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
        console.log("ATTATCH PAYMENT METHOD: ", attach);

        // Set the payment method as the default for future payments
        await stripe.customers.update(customer.id, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });

        //save the stripe infi in user data
        await UserModel.findByIdAndUpdate({ _id: userId }, { stripeCustomerId: customer.id, paymentMethodId: paymentMethodId });


        return res.status(200).json({ success: true, message: "Payment method added successfully" });
    } catch (error: any) {
        console.error("Error adding payment method:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createPaymentIntent = async (req: Request, res: Response) => {
    try {
        const { userId, amount, currency, serviceId } = req.body;

        // Validate request body
        if (!userId || !amount || !currency) {
            return res.status(400).json({ success: false, message: "userId, amount, and currency are required" });
        }

        // Fetch user details
        const user = await UserModel.findById({ _id: userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.stripeCustomerId) {
            return res.status(400).json({ success: false, message: "User does not have a Stripe Customer ID" });
        }

        if (!user.paymentMethodId) {
            return res.status(400).json({ success: false, message: "User does not have a saved payment method" });
        }

        // Create a PaymentIntent using the customer's default payment method
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100,
            currency,
            customer: user.stripeCustomerId,
            payment_method: user.paymentMethodId,
            receipt_email: user.email,
            description: "Service booking payment",
            confirm: true,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: "never",
            },
            metadata: {
                customer_name: user.firstName + ' ' + user.lastName,
                sender_name: user.firstName + ' ' + user.lastName,
                receiver_name: "AnyJob",
                // order_id: "ORD123456",
            },
        });

        //create purchase details when user will initiate a payment intent
        const purchaseData = {
            userId: user?._id,
            serviceId: new mongoose.Types.ObjectId(serviceId),
            paymentMethodId: user?.paymentMethodId,
            stripeCustomerId: paymentIntent?.customer,
            paymentIntentId: paymentIntent?.id,
            currency: currency,
            amount: amount,
        }
        const savePurchaseData = await new PurchaseModel(purchaseData).save();

        return res.status(200).json({ success: true, paymentIntent });
    } catch (error: any) {
        console.error("Error creating payment intent:", error);

        let failedPaymentIntent = error.payment_intent || null;

        // Save purchase details even for failed payments
        await new PurchaseModel({
            userId: req.body.userId,
            serviceId: req.body.serviceId,
            paymentMethodId: error.payment_method.id,
            stripeCustomerId: failedPaymentIntent?.customer || null,
            paymentIntentId: failedPaymentIntent?.id || null,
            currency: req.body.currency || "unknown",
            amount: req.body.amount || 0,
            status: "failed",
            errorMessage: error.message,
        }).save();

        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createCheckoutsession = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"], 
            mode: "setup", 
            customer_email: email, 
            success_url: "http://localhost:3000/success",
            cancel_url: "http://localhost:3000/cancel",
        });

        res.json({ id: session.url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}