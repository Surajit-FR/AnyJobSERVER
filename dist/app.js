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
const body_parser_1 = __importDefault(require("body-parser"));
const morgan_1 = __importDefault(require("morgan"));
const constants_1 = require("./constants");
app.use((0, cors_1.default)({
    origin: "*"
}));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json({ limit: constants_1.EXPRESS_CONFIG_LIMIT }));
app.use(express_1.default.urlencoded({ extended: true, limit: constants_1.EXPRESS_CONFIG_LIMIT }));
app.use(express_1.default.static("public"));
app.use((0, cookie_parser_1.default)());
app.use((0, body_parser_1.default)());
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
