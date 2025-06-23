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
exports.fetchAllAdminTransactions = exports.withdrawFunds = exports.createServiceCancellationCheckoutSession = exports.isTheFirstPurchase = exports.payForService = exports.createLeadGenerationCheckoutSession = exports.createAddFundsSession = exports.createConnectedAccountAndRedirect = exports.createPaymentIntent = exports.attatchPaymentMethod = exports.chargeSavedCard = exports.createCheckoutsession = void 0;
exports.createCustomerIfNotExists = createCustomerIfNotExists;
exports.transferIncentiveToSP = transferIncentiveToSP;
exports.createCustomConnectedAccount = createCustomConnectedAccount;
const stripe_1 = __importDefault(require("stripe"));
const config_1 = require("../config/config");
const user_model_1 = __importDefault(require("../models/user.model"));
const wallet_model_1 = __importDefault(require("../models/wallet.model"));
const mongoose_1 = __importDefault(require("mongoose"));
const purchase_model_1 = __importDefault(require("../models/purchase.model"));
const paymentMethod_model_1 = __importDefault(require("../models/paymentMethod.model"));
const service_model_1 = __importDefault(require("../models/service.model"));
const category_model_1 = __importDefault(require("../models/category.model"));
const userAdditionalInfo_model_1 = __importDefault(require("../models/userAdditionalInfo.model"));
const asyncHandler_1 = require("../utils/asyncHandler");
const adminRevenue_model_1 = __importDefault(require("../models/adminRevenue.model"));
const response_1 = require("../utils/response");
const stripe = new stripe_1.default(config_1.STRIPE_SECRET_KEY, {
    apiVersion: "2024-09-30.acacia",
});
function createCustomerIfNotExists(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield user_model_1.default.findById({ _id: userId });
        if (!user)
            throw new Error("User not found");
        if (!user.stripeCustomerId) {
            const customer = yield stripe.customers.create({
                email: user.email,
                name: user.firstName + " " + user.lastName || "default",
            });
            yield user_model_1.default.findByIdAndUpdate({ _id: userId }, { stripeCustomerId: customer.id });
        }
    });
}
function transferIncentiveToSP(serviceId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const serviceData = yield service_model_1.default.findById({ _id: serviceId });
        if (!serviceData)
            throw new Error("Service not found");
        if (serviceData.isIncentiveGiven) {
            const givenIncentiveByCustomer = serviceData.incentiveAmount;
            const spIncentiveAmt = givenIncentiveByCustomer * 0.9;
            const adminIncentiveAmt = givenIncentiveByCustomer * 0.1;
            const spId = serviceData.serviceProviderId;
            const spAccount = yield wallet_model_1.default.findOne({ userId: spId });
            if (!spAccount)
                throw new Error("SP account not found");
            const spStripeAccountId = spAccount.stripeConnectedAccountId;
            const transferGroup = `incentive_fee_${(_a = serviceData === null || serviceData === void 0 ? void 0 : serviceData.serviceProviderId) === null || _a === void 0 ? void 0 : _a.toString()}_service_${serviceId}`;
            const transfer = yield stripe.transfers.create({
                amount: spIncentiveAmt * 100,
                currency: "usd",
                destination: spStripeAccountId,
                transfer_group: transferGroup,
                description: `IncentiveFee_transfer_to_sp_${(_b = serviceData === null || serviceData === void 0 ? void 0 : serviceData.serviceProviderId) === null || _b === void 0 ? void 0 : _b.toString()}_for_service_${serviceId}`,
            });
            console.log({ transfer });
            if (transfer) {
                const transaction = {
                    userId: serviceData.userId,
                    type: "credit",
                    amount: adminIncentiveAmt,
                    description: "ServiceIncentiveAmount",
                    serviceId: serviceData._id,
                    stripeTransactionId: transfer.id,
                };
                yield new adminRevenue_model_1.default(transaction).save();
            }
        }
    });
}
//session for incentive payment
const createCheckoutsession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { amount, serviceId } = req.body;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const currency = "usd";
    const user = yield user_model_1.default.findById(userId);
    if (!user)
        return res.status(404).json({ success: false, message: "User not found" });
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
        const customer = yield stripe.customers.create({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
        });
        stripeCustomerId = customer.id;
        yield user_model_1.default.findByIdAndUpdate(userId, { stripeCustomerId });
    }
    const session = yield stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer: stripeCustomerId,
        line_items: [
            {
                price_data: {
                    currency,
                    unit_amount: amount * 100,
                    product_data: {
                        name: "Service Payment",
                    },
                },
                quantity: 1,
            },
        ],
        payment_intent_data: {
            description: `IncentiveFee_paid_by_customer_${userId === null || userId === void 0 ? void 0 : userId.toString()}_for_service_${serviceId}`,
            setup_future_usage: "on_session",
        },
        payment_method_data: {
            allow_redisplay: "always",
        },
        payment_method_options: {
            card: {
                request_three_d_secure: "any",
            },
        },
        metadata: {
            serviceId,
        },
        success_url: "https://frontend.theassure.co.uk/payment-success",
        cancel_url: "https://frontend.theassure.co.uk/payment-error",
    });
    console.log({ Incentivesession: session });
    res.json({ url: session.url });
});
exports.createCheckoutsession = createCheckoutsession;
const chargeSavedCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const { amount, serviceId } = req.body;
    const currency = "usd";
    const user = yield user_model_1.default.findById(userId);
    if (!user || !user.stripeCustomerId || !user.paymentMethodId) {
        return res.status(400).json({ message: "Missing Stripe data for user" });
    }
    try {
        const session = yield stripe.checkout.sessions.create({
            mode: "payment",
            customer: user.stripeCustomerId,
            payment_method_data: {
                allow_redisplay: "always",
                // user.paymentMethodId, // attach saved card
            },
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency,
                        unit_amount: amount * 100,
                        product_data: {
                            name: "Service Payment",
                        },
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                setup_future_usage: "off_session", // Save again if needed
                metadata: {
                    serviceId,
                },
            },
            success_url: "https://frontend.theassure.co.uk/payment-success",
            cancel_url: "https://frontend.theassure.co.uk/payment-error",
        });
        return res.status(200).json({ url: session.url });
    }
    catch (error) {
        console.error("Stripe checkout session error:", error);
        return res.status(500).json({ message: error.message });
    }
});
exports.chargeSavedCard = chargeSavedCard;
const attatchPaymentMethod = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, paymentMethodId, last4, brand, exp_month, exp_year } = req.body;
        console.log({ paymentMethodId });
        if (!userId || !paymentMethodId) {
            return res.status(400).json({
                success: false,
                message: "userId and paymentMethodId are required",
            });
        }
        // Fetch user from the database
        const user = yield user_model_1.default.findById({ _id: userId });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        if (user.stripeCustomerId || user.paymentMethodId) {
            return res.status(200).json({
                success: true,
                message: "User has already a saved payement method ",
            });
        }
        const customer = yield stripe.customers.create({
            email: user.email,
            name: user.firstName + " " + user.lastName || "default",
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
        const saveMethodInDB = yield new paymentMethod_model_1.default(newPaymentMethod).save();
        // Attach the new payment method to the Stripe customer
        const attach = yield stripe.paymentMethods.attach(paymentMethodId, {
            customer: customer.id,
        });
        console.log("ATTATCH PAYMENT METHOD: ", attach);
        // Set the payment method as the default for future payments
        yield stripe.customers.update(customer.id, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });
        //save the stripe infi in user data
        yield user_model_1.default.findByIdAndUpdate({ _id: userId }, { stripeCustomerId: customer.id, paymentMethodId: paymentMethodId });
        return res
            .status(200)
            .json({ success: true, message: "Payment method added successfully" });
    }
    catch (error) {
        console.error("Error adding payment method:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.attatchPaymentMethod = attatchPaymentMethod;
const createPaymentIntent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, amount, currency, serviceId } = req.body;
        // Validate request body
        if (!userId || !amount || !currency) {
            return res.status(400).json({
                success: false,
                message: "userId, amount, and currency are required",
            });
        }
        // Fetch user details
        const user = yield user_model_1.default.findById({ _id: userId });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }
        if (!user.stripeCustomerId) {
            return res.status(400).json({
                success: false,
                message: "User does not have a Stripe Customer ID",
            });
        }
        if (!user.paymentMethodId) {
            return res.status(400).json({
                success: false,
                message: "User does not have a saved payment method",
            });
        }
        // Create a PaymentIntent using the customer's default payment method
        const paymentIntent = yield stripe.paymentIntents.create({
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
                customer_name: user.firstName + " " + user.lastName,
                sender_name: user.firstName + " " + user.lastName,
                receiver_name: "AnyJob",
                // order_id: "ORD123456",
            },
        });
        //create purchase details when user will initiate a payment intent
        const purchaseData = {
            userId: user === null || user === void 0 ? void 0 : user._id,
            serviceId: new mongoose_1.default.Types.ObjectId(serviceId),
            paymentMethodId: user === null || user === void 0 ? void 0 : user.paymentMethodId,
            stripeCustomerId: paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.customer,
            paymentIntentId: paymentIntent === null || paymentIntent === void 0 ? void 0 : paymentIntent.id,
            currency: currency,
            amount: amount,
        };
        const savePurchaseData = yield new purchase_model_1.default(purchaseData).save();
        return res.status(200).json({ success: true, paymentIntent });
    }
    catch (error) {
        console.error("Error creating payment intent:", error);
        let failedPaymentIntent = error.payment_intent || null;
        // Save purchase details even for failed payments
        yield new purchase_model_1.default({
            userId: req.body.userId,
            serviceId: req.body.serviceId,
            paymentMethodId: error.payment_method.id,
            stripeCustomerId: (failedPaymentIntent === null || failedPaymentIntent === void 0 ? void 0 : failedPaymentIntent.customer) || null,
            paymentIntentId: (failedPaymentIntent === null || failedPaymentIntent === void 0 ? void 0 : failedPaymentIntent.id) || null,
            currency: req.body.currency || "unknown",
            amount: req.body.amount || 0,
            status: "failed",
            errorMessage: error.message,
        }).save();
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.createPaymentIntent = createPaymentIntent;
function createCustomConnectedAccount(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            const userWallet = yield wallet_model_1.default.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
            if (userWallet === null || userWallet === void 0 ? void 0 : userWallet.stripeConnectedAccountId) {
                return res.status(200).json({
                    message: "Account already exists",
                });
            }
            const dob = (_b = req.user) === null || _b === void 0 ? void 0 : _b.dob;
            if (!dob || !(dob instanceof Date)) {
                return res.status(400).json({ error: "Invalid date of birth" });
            }
            const accountParams = {
                type: "custom",
                country: "US",
                email: (_c = req.user) === null || _c === void 0 ? void 0 : _c.email,
                business_type: "individual",
                capabilities: {
                    transfers: { requested: true },
                },
                individual: {
                    first_name: (_d = req.user) === null || _d === void 0 ? void 0 : _d.firstName,
                    last_name: (_e = req.user) === null || _e === void 0 ? void 0 : _e.lastName,
                    email: (_f = req.user) === null || _f === void 0 ? void 0 : _f.email,
                    phone: (_g = req.user) === null || _g === void 0 ? void 0 : _g.phone,
                    dob: {
                        day: dob.getDate(),
                        month: dob.getMonth() + 1,
                        year: dob.getFullYear(),
                    },
                },
                tos_acceptance: {
                    date: Math.floor(Date.now() / 1000),
                    ip: req.ip || "127.0.0.1",
                },
            };
            const account = yield stripe.accounts.create(accountParams);
            yield new wallet_model_1.default({
                userId: (_h = req.user) === null || _h === void 0 ? void 0 : _h._id,
                stripeConnectedAccountId: account.id,
                balance: 0,
            }).save();
            yield stripe.accounts.update(account.id, {
                settings: {
                    payouts: {
                        schedule: {
                            interval: "manual",
                        },
                    },
                },
            });
            res.status(200).json({
                message: "Custom connected account created successfully",
                accountId: account.id,
            });
        }
        catch (error) {
            console.error("Stripe Custom Account Error:", error);
            res.status(500).json({ error: error.message });
        }
    });
}
//-------------------------------------create connected account-------------------------------------------->>
const createConnectedAccountAndRedirect = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = req.user; // assuming auth middleware attached user
        if (!user)
            return res.status(401).json({ error: "Unauthorized" });
        const dob = user.dob;
        if (!dob || !(dob instanceof Date)) {
            return res
                .status(400)
                .json({ error: "Invalid or missing date of birth" });
        }
        const additionalInfo = yield userAdditionalInfo_model_1.default.findOne({
            userId: user._id,
        });
        // Step 1: Create the Stripe custom account (without external_account)
        const account = yield stripe.accounts.create({
            type: "custom",
            country: "US",
            email: user.email,
            business_type: "individual",
            capabilities: {
                transfers: { requested: true },
            },
            individual: {
                first_name: user.firstName,
                last_name: user.lastName,
                email: user.email,
                phone: (_a = user.phone) === null || _a === void 0 ? void 0 : _a.slice(3),
                ssn_last_4: additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.socialSecurity,
                dob: {
                    day: dob.getDate(),
                    month: dob.getMonth() + 1,
                    year: dob.getFullYear(),
                },
            },
            business_profile: {
                url: "https://your-test-business.com",
                mcc: "5818",
            },
            tos_acceptance: {
                date: Math.floor(Date.now() / 1000),
                ip: req.ip || "127.0.0.1",
            },
        });
        // Save to DB (create Wallet entry)
        yield new wallet_model_1.default({
            userId: user._id,
            stripeConnectedAccountId: account.id,
            balance: 0,
        }).save();
        // Step 2: Create the Stripe onboarding link (redirect user to it)
        const accountLink = yield stripe.accountLinks.create({
            account: account.id,
            refresh_url: "https://your-frontend.com/onboarding-refresh",
            return_url: "https://your-frontend.com/onboarding-return",
            type: "account_onboarding",
        });
        // Send back the onboarding URL
        res.status(200).json({
            message: "Stripe account created. Redirect user to onboarding.",
            onboardingUrl: accountLink.url,
        });
    }
    catch (err) {
        console.error("Stripe onboarding error:", err);
        res.status(500).json({ error: err.message });
    }
});
exports.createConnectedAccountAndRedirect = createConnectedAccountAndRedirect;
//----------------------wallet integration------------------------------------------------------------------>>
// //add fund into wallet
const createAddFundsSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { amount } = req.body;
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer: (_a = req.user) === null || _a === void 0 ? void 0 : _a.stripeCustomerId,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        unit_amount: amount * 100,
                        product_data: {
                            name: "Add Funds to Wallet",
                        },
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                setup_future_usage: "on_session",
            },
            payment_method_data: {
                allow_redisplay: "always",
            },
            metadata: {
                purpose: "wallet_topup",
            },
            success_url: `https://frontend.theassure.co.uk/payment-success`,
            cancel_url: `https://frontend.theassure.co.uk/payment-error`,
        });
        res.status(200).json({ url: session.url });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
exports.createAddFundsSession = createAddFundsSession;
// pay lead generation fee with stripe hosted UI not in use
const createLeadGenerationCheckoutSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { serviceId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const serviceDetails = yield service_model_1.default.findOne({ _id: serviceId });
        const categoryId = serviceDetails === null || serviceDetails === void 0 ? void 0 : serviceDetails.categoryId;
        const categoryDetails = yield category_model_1.default.findById({ _id: categoryId });
        const leadGenerationFee = Math.floor(Number(categoryDetails === null || categoryDetails === void 0 ? void 0 : categoryDetails.serviceCost) * 0.25);
        const amount = leadGenerationFee;
        const user = yield user_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = yield stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
            });
            stripeCustomerId = customer.id;
            yield user_model_1.default.findByIdAndUpdate(userId, { stripeCustomerId });
        }
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer: stripeCustomerId,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        unit_amount: amount * 100,
                        product_data: {
                            name: "Lead Generation Fee",
                        },
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                purpose: "leadGenerationee",
                serviceId,
                userId: userId === null || userId === void 0 ? void 0 : userId.toString(),
            },
            success_url: "https://frontend.theassure.co.uk/service-payment-success",
            cancel_url: "https://frontend.theassure.co.uk/service-payment-cancel",
        });
        res.json({ url: session.url });
    }
    catch (err) {
        console.error("Error creating Checkout Session for service fee:", err);
        res.status(500).json({ error: err.message });
    }
});
exports.createLeadGenerationCheckoutSession = createLeadGenerationCheckoutSession;
// pay lead generation fee without stripe hosted UI
const payForService = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { serviceId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const spWalletDetails = yield wallet_model_1.default.findOne({ userId });
        if (!spWalletDetails) {
            return res
                .status(400)
                .json({ error: "User does not have a connected Wallet account" });
        }
        //calculate fee
        const serviceDetails = yield service_model_1.default.findOne({ _id: serviceId });
        const categoryId = serviceDetails === null || serviceDetails === void 0 ? void 0 : serviceDetails.categoryId;
        const categoryDetails = yield category_model_1.default.findById({ _id: categoryId });
        const leadGenerationFee = Math.floor(Number(categoryDetails === null || categoryDetails === void 0 ? void 0 : categoryDetails.serviceCost) * 0.25);
        const amount = leadGenerationFee;
        //---------------------------------------------------------------------------------->
        if ((spWalletDetails === null || spWalletDetails === void 0 ? void 0 : spWalletDetails.balance) - amount < 200) {
            return res.status(400).json({ error: "Insufficient balance" });
        }
        const account = yield stripe.accounts.retrieve();
        // Transfer funds from user's connected account to platform (admin)
        const transfer = yield stripe.transfers.create({
            amount: 100 * amount,
            currency: "usd",
            destination: account === null || account === void 0 ? void 0 : account.id,
            description: `LeadGenerationFee_for_service_${serviceId}`,
            transfer_group: `service-67ac74fb12c4396eb2f5d52b}-${Date.now()}`,
        }, {
            stripeAccount: spWalletDetails === null || spWalletDetails === void 0 ? void 0 : spWalletDetails.stripeConnectedAccountId,
        });
        console.log({ transfer });
        const transactionData = {
            type: "debit",
            amount: amount,
            description: "LeadGenerationFee",
            serviceId: serviceId,
            stripeTransactionId: transfer.id,
        };
        yield wallet_model_1.default.findOneAndUpdate({ userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id }, {
            $push: {
                transactions: transactionData,
            },
            $inc: {
                balance: transactionData.type === "credit"
                    ? transactionData.amount
                    : -transactionData.amount,
            },
            updatedAt: Date.now(),
        }, { new: true });
        const Admintransaction = {
            userId: userId,
            type: "credit",
            amount: amount,
            description: "LeadGenerationFee",
            stripeTransactionId: transfer.id,
            serviceId,
        };
        yield new adminRevenue_model_1.default(Admintransaction).save();
        console.log({ Admintransaction });
        res.status(200).json({
            message: "Payment for the Service made successfully",
            success: true,
            transfer,
        });
    }
    catch (error) {
        console.error("Service payment error:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.payForService = payForService;
const isTheFirstPurchase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
    const checkPurchaseModel = yield purchase_model_1.default.find({ userId });
    const isTheFirstPurchase = checkPurchaseModel.length > 0 ? true : false;
    res.status(200).json({
        message: "Payment status check successfully",
        isTheFirstPurchase: isTheFirstPurchase,
    });
});
exports.isTheFirstPurchase = isTheFirstPurchase;
//checkout session for service cancellation by customer
const createServiceCancellationCheckoutSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { serviceId, cancellationReason } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const serviceDeatils = yield service_model_1.default.findOne({
            _id: serviceId,
        });
        const categoryId = serviceDeatils === null || serviceDeatils === void 0 ? void 0 : serviceDeatils.categoryId;
        const categoryDetails = yield category_model_1.default.findById(categoryId);
        console.log({ serviceDeatils });
        if (!categoryDetails) {
            return (0, response_1.sendSuccessResponse)(res, 400, "categoryDetails not found");
        }
        const serviceCost = Number(categoryDetails.serviceCost);
        console.log({ serviceCost });
        const SPStripeAccount = yield wallet_model_1.default.findOne({
            userId: serviceDeatils === null || serviceDeatils === void 0 ? void 0 : serviceDeatils.serviceProviderId,
        });
        const SPStripeAccountId = SPStripeAccount === null || SPStripeAccount === void 0 ? void 0 : SPStripeAccount.stripeConnectedAccountId;
        const amount = serviceCost * 0.25;
        const AnyJobAmount = Math.ceil(amount * 25) / 100;
        const SPAmount = Math.ceil(amount * 75) / 100;
        const user = yield user_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        let stripeCustomerId = user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = yield stripe.customers.create({
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
            });
            stripeCustomerId = customer.id;
            yield user_model_1.default.findByIdAndUpdate(userId, { stripeCustomerId });
        }
        const transferGroup = `cancellation_fee_sp_${(_b = serviceDeatils === null || serviceDeatils === void 0 ? void 0 : serviceDeatils.serviceProviderId) === null || _b === void 0 ? void 0 : _b.toString()}_service_${serviceId}`;
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer: stripeCustomerId,
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        unit_amount: (AnyJobAmount + SPAmount) * 100,
                        product_data: {
                            name: "Cancellation Fee",
                        },
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                setup_future_usage: "on_session",
                description: `cancellationfee_paid_by_customer_${(_c = serviceDeatils === null || serviceDeatils === void 0 ? void 0 : serviceDeatils.serviceProviderId) === null || _c === void 0 ? void 0 : _c.toString()}_for_service_${serviceId}`,
            },
            payment_method_data: {
                allow_redisplay: "always",
            },
            metadata: {
                purpose: "CancellationFee",
                serviceId,
                cancellationReason,
                userId: userId === null || userId === void 0 ? void 0 : userId.toString(),
                SPId: (_d = serviceDeatils === null || serviceDeatils === void 0 ? void 0 : serviceDeatils.serviceProviderId) === null || _d === void 0 ? void 0 : _d.toString(),
                SPAmount,
                SPStripeAccountId,
            },
            success_url: "https://frontend.theassure.co.uk/payment-success",
            cancel_url: "https://frontend.theassure.co.uk/payment-error",
        });
        console.log({ cancellationSession: session });
        res.json({ url: session.url });
    }
    catch (err) {
        console.error("Error creating Checkout Session for service fee:", err);
        res.status(500).json({ error: err.message });
    }
});
exports.createServiceCancellationCheckoutSession = createServiceCancellationCheckoutSession;
const withdrawFunds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        let { amount, currency = "usd" } = req.body;
        const walletDetails = yield wallet_model_1.default.findOne({ userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id });
        const connectedAccountId = walletDetails === null || walletDetails === void 0 ? void 0 : walletDetails.stripeConnectedAccountId;
        if (!connectedAccountId) {
            return res.status(400).json({ error: "Missing connected account ID." });
        }
        if (!amount || !currency) {
            return res
                .status(400)
                .json({ error: "Amount and currency are required." });
        }
        // Optional: Check available balance
        const balance = yield stripe.balance.retrieve({
            stripeAccount: connectedAccountId,
        });
        const available = balance.available.find((b) => b.currency === currency.toLowerCase());
        if (!available || available.amount - amount < 200) {
            return res
                .status(400)
                .json({ error: "Insufficient balance for payout." });
        }
        // Create the payout
        const payout = yield stripe.payouts.create({
            amount: amount * 100,
            currency,
        }, {
            stripeAccount: connectedAccountId,
        });
        const transaction = {
            type: "debit",
            amount,
            description: "WithdrawFund",
            stripeTransactionId: payout.id,
        };
        yield wallet_model_1.default.findOneAndUpdate({ userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id }, {
            $push: { transactions: transaction },
            $inc: { balance: -amount },
            updatedAt: Date.now(),
        });
        return res.status(200).json({
            message: "Payout initiated successfully.",
            success: true,
            payout,
        });
    }
    catch (error) {
        console.error("Payout Error:", error);
        return res.status(500).json({ error: error.message });
    }
});
exports.withdrawFunds = withdrawFunds;
exports.fetchAllAdminTransactions = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { page = "1", limit = "100", startingAfter = "", query = "", sortBy = "created", sortType = "desc", } = req.query;
    const limitNumber = Math.min(parseInt(limit, 10) || 10, 100);
    const stripeParams = {
        limit: limitNumber,
    };
    if (startingAfter) {
        stripeParams.starting_after = startingAfter;
    }
    // Fetch transactions from Stripe
    const transactions = yield stripe.balanceTransactions.list(stripeParams);
    return res.status(200).json({
        message: "Admin transactions fetched successfully.",
        success: true,
        data: transactions.data,
        //   hasMore: transactions.has_more,
        //   nextStartingAfter: transactions.data.length > 0 ? transactions.data[transactions.data.length - 1].id : null,
    });
}));
