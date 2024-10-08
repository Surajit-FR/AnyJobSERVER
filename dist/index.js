"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: './.env' });
const db_1 = __importDefault(require("./db/db"));
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const server = http_1.default.createServer(app_1.app);
// Initialize Socket.io with the HTTP server
(0, socket_1.initSocket)(server);
(0, db_1.default)().then(() => {
    server.on("error", (error) => {
        console.log(`Server Connection Error: ${error}`);
    });
    server.listen(process.env.PORT || 8000, () => {
        console.log(`⚙️  Server Connected On Port: ${process.env.PORT}\n`);
    });
}).catch((err) => {
    console.log("MongoDB Connection Failed!!", err);
});
