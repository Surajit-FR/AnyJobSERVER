"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
exports.app = app;
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const constants_1 = require("./constants");
app.use((0, cors_1.default)({
    origin: ["https://frontend.theassure.co.uk", "http://localhost:3000"],
    credentials: true,
}));
app.use(function (req, res, next) {
    // Website you wish to allow to connect
    // res.setHeader('Access-Control-Allow-Origin', 'https://frontend.theassure.co.uk');
    // res.setHeader('Access-Control-Allow-Origin', 'https://frontend.theassure.co.uk');
    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', "true");
    // Pass to next layer of middleware
    next();
});
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json({ limit: constants_1.EXPRESS_CONFIG_LIMIT }));
app.use(express_1.default.urlencoded({ extended: true, limit: constants_1.EXPRESS_CONFIG_LIMIT }));
app.use(express_1.default.static("public"));
app.use((0, cookie_parser_1.default)());
//routes
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
//Admin routes
app.use("/api/v1/healthcheck", healthcheck_routes_1.default);
app.use("/api/v1/auth", auth_routes_1.default);
app.use('/api/v1/category', category_routes_1.default);
app.use('/api/v1/user', user_routes_1.default);
app.use('/api/v1/service', service_routes_1.default);
app.use('/api/v1/question', question_routes_1.default);
app.use('/api/v1/shift', shift_routes_1.default);
app.use('/api/v1/google-cloud', googleCloud_routes_1.default);
app.use('/api/v1/chat', chat_routes_1.default);
app.use('/api/v1/', upload_routes_1.default);
// Customer routes
app.use('/api/v1/customer', user_routes_2.default);
app.use('/api/v1/otp', otp_routes_1.default);
app.use('/api/v1/rating', rating_routes_1.default);
app.get('/ping', (req, res) => {
    res.send("Hi!...I am server, Happy to see you boss...");
});
//internal server error handling
app.use((err, req, res, next) => {
    console.log(err);
    res.status(500).json({
        status: 500,
        message: "Server Error",
        error: err.message
    });
});
//page not found middleware handling
app.use((req, res, next) => {
    res.status(404).json({
        sattus: 404,
        message: "Endpoint Not Found"
    });
});
