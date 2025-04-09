import express, { Router } from "express";
import { createPaymentIntent, createCustomerIfNotExists, attatchPaymentMethod, createCheckoutsession } from '../controller/stripe.controller';
import { stripeWebhook } from "../controller/webhook.controller";

const router: Router = express.Router();

//STRIPE API ROUTES
router.post("/create-stripe-customer", createCustomerIfNotExists);
router.post("/attatch-payment-method", attatchPaymentMethod);
router.post("/create-payment-intent", createPaymentIntent);


//STRIPE WEBHOOK ROUTE
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

router.post("/create-checkout-session",createCheckoutsession );



export default router;