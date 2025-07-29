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
exports.removeStaleFcmTokens = exports.storeFcmToken = void 0;
exports.sendPushNotification = sendPushNotification;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const notification_model_1 = require("../models/notification.model");
const config_1 = require("../config/config");
const messaging_1 = require("firebase-admin/messaging");
const serviceAccount = {
    type: config_1.FIREBASE_TYPE,
    project_id: config_1.FIREBASE_PROJECT_ID,
    private_key_id: config_1.FIREBASE_PRIVATE_KEY_ID,
    private_key: config_1.FIREBASE_PRIVATE_KEY === null || config_1.FIREBASE_PRIVATE_KEY === void 0 ? void 0 : config_1.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: config_1.FIREBASE_CLIENT_EMAIL,
    client_id: config_1.FIREBASE_CLIENT_ID,
    auth_uri: config_1.FIREBASE_AUTH_URI,
    token_uri: config_1.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: config_1.FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: config_1.FIREBASE_CLIENT_CERT_URL,
    universe_domain: config_1.FIREBASE_UNIVERSE_DOMAIN,
};
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount),
});
const firestore = firebase_admin_1.default.firestore(); //Gets firebase store
// console.log(firestore,"firestore");
// Store FCM token
const storeFcmToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId, token } = req.body;
        if (!userId || !token) {
            return res
                .status(400)
                .json({ message: "User ID and token are required." });
        }
        const userRef = firestore.collection("fcmTokens").doc(userId);
        const doc = yield userRef.get();
        if (doc.exists) {
            const existingTokens = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.tokens) || [];
            if (!existingTokens.includes(token)) {
                yield userRef.update({
                    tokens: [...existingTokens, token],
                    updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        else {
            yield userRef.set({
                tokens: [token],
                updatedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp(),
            });
        }
        res.status(200).json({ message: "Token stored successfully." });
    }
    catch (error) {
        console.error("Error storing FCM token:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.storeFcmToken = storeFcmToken;
//remove stale tokens
const removeStaleFcmTokens = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const snapshot = yield firestore.collection("fcmTokens").get();
        snapshot.forEach((doc) => __awaiter(void 0, void 0, void 0, function* () {
            const { updatedAt, tokens } = doc.data();
            if ((updatedAt === null || updatedAt === void 0 ? void 0 : updatedAt.toDate()) < oneMonthAgo) {
                yield doc.ref.delete();
                console.log(`Deleted stale tokens for user: ${doc.id}`);
            }
        }));
        console.log("Stale tokens cleanup completed.");
    }
    catch (error) {
        console.error("Error removing stale FCM tokens:", error);
    }
});
exports.removeStaleFcmTokens = removeStaleFcmTokens;
// Function to send notification
// export default async function sendNotification(token: string, title: string, body: string, dbData?: object) {
//     const message = {
//         notification: { title, body },
//         token,
//     };
//     try {
//         const response = await admin.messaging().send(message);
//         if (dbData) {
//             const notification = new NotificationModel(dbData);
//             await notification.save();
//             console.log("Notification saved to database:", notification);
//         }
//         console.log("Notification sent successfully:", response);
//     } catch (error) {
//         console.error("Error sending notification:", error);
//     }
// };
function sendPushNotification(userId, title, body, dbData) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const userRef = firestore.collection("fcmTokens").doc(userId);
            const doc = yield userRef.get();
            if (!doc.exists)
                return console.log("No FCM tokens found for user:", userId);
            let tokens = ((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.tokens) || [];
            const message = {
                notification: { body },
                tokens: tokens,
            };
            const response = yield (0, messaging_1.getMessaging)().sendEachForMulticast(message);
            // Handle invalid tokens
            response.responses.forEach((res, index) => {
                var _a, _b;
                if (!res.success &&
                    (((_a = res.error) === null || _a === void 0 ? void 0 : _a.code) === "messaging/registration-token-not-registered" ||
                        ((_b = res.error) === null || _b === void 0 ? void 0 : _b.code) === "messaging/invalid-argument")) {
                    tokens.splice(index, 1);
                }
            });
            // Update Firestore if tokens were removed
            if (tokens.length === 0) {
                yield userRef.delete();
            }
            else {
                yield userRef.update({ tokens });
            }
            if (dbData) {
                const notification = new notification_model_1.NotificationModel(dbData);
                yield notification.save();
                // console.log("Notification saved to database:", notification);
            }
            console.log("Notification sent successfully");
        }
        catch (error) {
            console.error("Error sending notification:", error);
        }
    });
}
