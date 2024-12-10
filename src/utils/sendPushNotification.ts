import admin from "firebase-admin";
// import serviceAccount from "../../"
const serviceAccount = require("./path-to-service-account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Function to send notification
export default async function sendNotification(token: string, title: string, body: string, data?: Record<string, string>) {
    const message = {
        notification: { title, body },
        data: data || {}, 
        token, 
    };

    try {
        const response = await admin.messaging().send(message);
        console.log("Notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}
