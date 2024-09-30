"use strict";
// import dotenv from 'dotenv';
// dotenv.config({ path: "./.env" });
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import http from 'http';
// import { app } from './app';
// const server = http.createServer(app);
// console.log(server);
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: './.env' });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const server = http_1.default.createServer(app_1.app);
