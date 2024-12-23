import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: parseInt(process.env.SMTP_PORT || '587', 10),
//     secure: process.env.SMTP_SECURE === 'true',
//     auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASS,
//     },
// });

//Testing Credentials...
var transporter = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
      user: "19024c0621b3e6",
      pass: "c1a5ae6cf88e23"
    }
  });

export const sendMail = async (to: string, subject: string, html?: string) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to,
            subject,
            html    //const html = `Dear ${savedUser.firstName} ${savedUser.lastName}, your login credentials for AnyJob are: <b>Password: ${generatedPass}</b> or you can directly log in using your registered <b>Phone Number: ${savedUser.phone}</b>.`;
        });

        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};