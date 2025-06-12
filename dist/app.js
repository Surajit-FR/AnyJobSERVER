"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const node_cron_1 = __importDefault(require("node-cron"));
const constants_1 = require("./constants");
const stripe_routes_1 = __importDefault(require("./routes/stripe.routes"));
const healthcheck_routes_1 = __importDefault(require("./routes/healthcheck.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const user_routes_2 = __importDefault(require("./routes/user/user.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const service_routes_1 = __importDefault(require("./routes/service.routes"));
const question_routes_1 = __importDefault(require("./routes/question.routes"));
const shift_routes_1 = __importDefault(require("./routes/shift.routes"));
const otp_routes_1 = __importDefault(require("./routes/otp.routes"));
const rating_routes_1 = __importDefault(require("./routes/rating.routes"));
const googleCloud_routes_1 = __importDefault(require("./routes/googleCloud.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const sendPushNotification_1 = require("../src/utils/sendPushNotification");
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
const webhook_routes_1 = __importDefault(require("./routes/webhook.routes"));
const app = (0, express_1.default)();
exports.app = app;
// ✅ 1. CORS Middleware
app.use((0, cors_1.default)({
    origin: [
        "https://frontend.theassure.co.uk",
        "http://localhost:3000",
        process.env.CORS_ORIGIN,
        "http://ec2-65-2-73-95.ap-south-1.compute.amazonaws.com",
        "http://65.2.73.95",
        "http://15.207.110.84",
    ],
    credentials: true,
}));
// ✅ 2. Raw Body Middleware for Stripe Webhook
app.use("/stripe", express_1.default.raw({ type: "application/json" }), webhook_routes_1.default);
// ✅ 3. General Middleware 
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json({ limit: constants_1.EXPRESS_CONFIG_LIMIT })); // JSON Parsing for Other Routes
app.use(express_1.default.urlencoded({ extended: true, limit: constants_1.EXPRESS_CONFIG_LIMIT }));
app.use(express_1.default.static("public"));
app.use((0, cookie_parser_1.default)());
// ✅ 4. Regular API Routes (Stripe API but NOT webhook)
app.use("/api/v1/stripe", stripe_routes_1.default);
// ✅ 5. Other API Routes
app.use("/api/v1/healthcheck", healthcheck_routes_1.default);
app.use("/api/v1/auth", auth_routes_1.default);
app.use("/api/v1/category", category_routes_1.default);
app.use("/api/v1/user", user_routes_1.default);
app.use("/api/v1/service", service_routes_1.default);
app.use("/api/v1/question", question_routes_1.default);
app.use("/api/v1/shift", shift_routes_1.default);
app.use("/api/v1/google-cloud", googleCloud_routes_1.default);
app.use("/api/v1/chat", chat_routes_1.default);
app.use("/api/v1/", upload_routes_1.default);
app.use("/api/v1/wallet", wallet_routes_1.default);
// ✅ 6. Customer Routes
app.use("/api/v1/customer", user_routes_2.default);
app.use("/api/v1/otp", otp_routes_1.default);
app.use("/api/v1/rating", rating_routes_1.default);
// ✅ 7. Ping Route for Health Check
app.get("/ping", (req, res) => {
    res.send("Hi!...I am server, Happy to see you boss...");
});
// ✅ 8. Internal Server Error Handling
app.use((err, req, res, next) => {
    console.log(err);
    res.status(500).json({
        status: 500,
        message: "Server Error",
        error: err.message,
    });
});
// ✅ 9. 404 Not Found Middleware
app.use((req, res, next) => {
    res.status(404).json({
        status: 404,
        message: "Endpoint Not Found",
    });
});
// ✅ 10. Scheduled Cleanup Jobs
node_cron_1.default.schedule("0 0 * * *", () => {
    console.log("Midnight cron job starts...");
    // Schedule a task every minute after midnight
    node_cron_1.default.schedule("*/1 * * * *", sendPushNotification_1.removeStaleFcmTokens);
    console.log("Scheduled the job to run every minute after midnight.");
});
