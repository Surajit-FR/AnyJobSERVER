

import dotenv from "dotenv";
dotenv.config({ path: './.env' });

import connectDB from './db/db';
import http from 'http';
import { app } from "./app";

const server = http.createServer(app);

connectDB().then(() => {
    server.on("error", (error) => {
        console.log(`Server Connection Error: ${error}`);
    });
    server.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️  Server Connected On Port: ${process.env.PORT}\n`);
    });
}).catch((err) => {
    console.log("MongoDB Connection Failed!!", err);

});




