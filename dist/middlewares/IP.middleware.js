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
exports.captureIP = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const IP_model_1 = __importDefault(require("../models/IP.model"));
exports.captureIP = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ipAddress, country, region, latitude, longitude, userAgent, route, userId, userType, } = req.body;
        if (!ipAddress || !userAgent || !route) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }
        // Create a new IPLog document
        const newLog = yield IP_model_1.default.create({
            ipAddress,
            country,
            region,
            latitude,
            longitude,
            userAgent,
            route,
            userId: userId || null,
            userType: userType || null,
        });
        // Respond with the created log entry
        res.status(201).json({
            message: "IP Log entry created successfully.",
            log: newLog,
        });
    }
    catch (error) {
        console.error("Error creating IP log:", error);
        res.status(500).json({
            message: "An error occurred while creating the IP log.",
        });
    }
}));
