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
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json({ limit: constants_1.EXPRESS_CONFIG_LIMIT }));
app.use(express_1.default.urlencoded({ extended: true, limit: constants_1.EXPRESS_CONFIG_LIMIT }));
app.use(express_1.default.static("public"));
app.use((0, cookie_parser_1.default)());
//routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const category_routes_1 = __importDefault(require("./routes/category.routes"));
const subcategory_routes_1 = __importDefault(require("./routes/subcategory.routes"));
const service_routes_1 = __importDefault(require("./routes/service.routes"));
const question_routes_1 = __importDefault(require("./routes/question.routes"));
const shift_routes_1 = __importDefault(require("./routes/shift.routes"));
app.use("/api/v1/auth", auth_routes_1.default);
app.use('/api/v1/user', user_routes_1.default);
app.use('/api/v1/category', category_routes_1.default);
app.use('/api/v1/subcategory', subcategory_routes_1.default);
app.use('/api/v1/service', service_routes_1.default);
app.use('/api/v1/question', question_routes_1.default);
app.use('/api/v1/shift', shift_routes_1.default);
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
