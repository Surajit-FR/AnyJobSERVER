import admin from "firebase-admin";
import dotenv from 'dotenv';
import { NotificationModel } from "../models/notification.model";
import  {FIREBASE_TYPE,FIREBASE_PROJECT_ID,FIREBASE_PRIVATE_KEY_ID,FIREBASE_PRIVATE_KEY,FIREBASE_CLIENT_EMAIL,FIREBASE_CLIENT_ID,FIREBASE_AUTH_URI,FIREBASE_AUTH_PROVIDER_CERT_URL,FIREBASE_CLIENT_CERT_URL,FIREBASE_UNIVERSE_DOMAIN,FIREBASE_TOKEN_URI} from "../config/config";
// import serviceAccount from "../../"
// const serviceAccount = require("./path-to-service-account.json");

const serviceAccount = {
    type: FIREBASE_TYPE,
    project_id: FIREBASE_PROJECT_ID,
    private_key_id: FIREBASE_PRIVATE_KEY_ID,
    private_key: FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: FIREBASE_CLIENT_EMAIL,
    client_id: FIREBASE_CLIENT_ID,
    auth_uri: FIREBASE_AUTH_URI,
    token_uri: FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: FIREBASE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: FIREBASE_CLIENT_CERT_URL,
    universe_domain: FIREBASE_UNIVERSE_DOMAIN,
};
// console.log({serviceAccount});



// Function to send notification

export default async function sendNotification(token: string, title: string, body: string, dbData?: object) {

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
    });

    const message = {
        notification: { title, body },
        token,
    };
    try {
        const response = await admin.messaging().send(message);
        
        if ( dbData) {
            const notification = new NotificationModel(dbData);
            await notification.save();
            console.log("Notification saved to database:", notification);
          }
        console.log("Notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending notification:", error);
    }
    
}
