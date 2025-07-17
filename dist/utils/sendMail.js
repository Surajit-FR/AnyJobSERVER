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
exports.sendMailToAdmin = exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
//Testing Credentials...
var transporter = nodemailer_1.default.createTransport({
    name: "AnyJob",
    service: "gmail",
    auth: {
        user: "miltonbaker.psoriatic@gmail.com",
        pass: "vjmxuslfvothtzqd",
    },
    socketTimeout: 5000000,
});
const sendMail = (to, subject, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const info = yield transporter.sendMail({
            from: `AnyJob <miltonbaker.psoriatic@gmail.com>`,
            to,
            subject,
            html, //const html = `Dear ${savedUser.firstName} ${savedUser.lastName}, your login credentials for AnyJob are: <b>Password: ${generatedPass}</b> or you can directly log in using your registered <b>Phone Number: ${savedUser.phone}</b>.`;
        });
        console.log("Message sent: %s", info.messageId);
        return info;
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
});
exports.sendMail = sendMail;
//contact us
const sendMailToAdmin = (from, senderName, html) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const info = yield transporter.sendMail({
            from: `${senderName}<${from}>`,
            to: "miltonbaker.psoriatic@gmail.com",
            subject: `New Message from ${senderName}`,
            html,
        });
        console.log("Message sent: %s", info.messageId);
        return info;
    }
    catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
});
exports.sendMailToAdmin = sendMailToAdmin;
