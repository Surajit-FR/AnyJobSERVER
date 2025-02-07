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
exports.healthcheck = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const mongoose_1 = __importDefault(require("mongoose"));
const os_1 = __importDefault(require("os"));
const ApisErrors_1 = require("../utils/ApisErrors");
// healthcheck controller
exports.healthcheck = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const networkInterfaces = os_1.default.networkInterfaces();
        // Extract IPv4 addresses
        const IPv4Addresses = Object.values(networkInterfaces)
            .flat()
            .filter((interfaceInfo) => interfaceInfo !== undefined && interfaceInfo.family === 'IPv4')
            .map(interfaceInfo => interfaceInfo.address);
        if (mongoose_1.default.connection.name) {
            const message = {
                host: IPv4Addresses,
                message: 'Healthy',
                status: true,
                time: new Date(),
            };
            return res.status(200).json({ response: message });
        }
        else {
            const message = {
                host: IPv4Addresses,
                message: 'Unhealthy',
                status: false,
                time: new Date(),
            };
            return res.status(501).json({ response: message });
        }
    }
    catch (error) {
        throw new ApisErrors_1.ApiError(500, error.message);
    }
}));
