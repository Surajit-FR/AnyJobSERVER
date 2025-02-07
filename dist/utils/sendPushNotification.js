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
exports.default = sendNotification;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const notification_model_1 = require("../models/notification.model");
const config_1 = require("../config/config");
// import serviceAccount from "../../"
// const serviceAccount = require("./path-to-service-account.json");
const serviceAccount = {
    type: config_1.FIREBASE_TYPE,
    project_id: config_1.FIREBASE_PROJECT_ID,
    private_key_id: config_1.FIREBASE_PRIVATE_KEY_ID,
    private_key: config_1.FIREBASE_PRIVATE_KEY === null || config_1.FIREBASE_PRIVATE_KEY === void 0 ? void 0 : config_1.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: config_1.FIREBASE_CLIENT_EMAIL,
    client_id: config_1.FIREBASE_CLIENT_ID,
    auth_uri: config_1.FIREBASE_AUTH_URI,
    token_uri: config_1.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: config_1.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: config_1.FIREBASE_CLIENT_CERT_URL,
    universe_domain: config_1.FIREBASE_UNIVERSE_DOMAIN,
};
// console.log({serviceAccount});
// Function to send notification
function sendNotification(token, title, body, dbData) {
    return __awaiter(this, void 0, void 0, function* () {
        firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert(serviceAccount),
        });
        const message = {
            notification: { title, body },
            token,
        };
        try {
            const response = yield firebase_admin_1.default.messaging().send(message);
            if (dbData) {
                const notification = new notification_model_1.NotificationModel(dbData);
                yield notification.save();
                console.log("Notification saved to database:", notification);
            }
            console.log("Notification sent successfully:", response);
        }
        catch (error) {
            console.error("Error sending notification:", error);
        }
    });
}
