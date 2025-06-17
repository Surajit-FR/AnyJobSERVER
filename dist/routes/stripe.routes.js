"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stripe_controller_1 = require("../controller/stripe.controller");
const webhook_controller_1 = require("../controller/webhook.controller");
const userAuth_1 = require("../middlewares/auth/userAuth");
const router = express_1.default.Router();
//STRIPE API ROUTES
router.post("/create-stripe-customer", stripe_controller_1.createCustomerIfNotExists);
router.post("/attatch-payment-method", stripe_controller_1.attatchPaymentMethod);
router.post("/create-payment-intent", stripe_controller_1.createPaymentIntent);
//STRIPE WEBHOOK ROUTE
router.post("/webhook", express_1.default.raw({ type: "application/json" }), webhook_controller_1.stripeWebhook);
router.get("/fetch-admin-transactions", stripe_controller_1.fetchAllAdminTransactions);
router.use(userAuth_1.VerifyJWTToken);
router.post("/create-checkout-session", stripe_controller_1.createCheckoutsession);
router.post("/create-cancellation-session", stripe_controller_1.createServiceCancellationCheckoutSession);
router.post("/charge-saved-card", stripe_controller_1.chargeSavedCard);
router.post("/add-funds", stripe_controller_1.createAddFundsSession);
router.post("/pay-fee", stripe_controller_1.payForService);
router.post("/withdraw-fund", stripe_controller_1.withdrawFunds);
router.get("/check-first-purchase", stripe_controller_1.isTheFirstPurchase);
router.post("/create-stripe-account", stripe_controller_1.createConnectedAccountAndRedirect);
exports.default = router;
