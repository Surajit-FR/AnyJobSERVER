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
exports.getCoordinatesFromZip = exports.reverseGeocode = void 0;
const axios_1 = __importDefault(require("axios"));
const asyncHandler_1 = require("../utils/asyncHandler");
const response_1 = require("../utils/response");
const ApisErrors_1 = require("../utils/ApisErrors");
// reverseGeocode to fetch address or location string from coordinates
exports.reverseGeocode = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { latitude, longitude } = req.query;
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!latitude || !longitude) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Latitude and longitude are required.", [], null));
    }
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`;
    try {
        const response = yield axios_1.default.get(url);
        if (!response.data.results || response.data.results.length === 0) {
            throw new ApisErrors_1.ApiError(400, "No address found for the given coordinates.", [], response.data);
        }
        const address = {
            zipCode: response.data.results[0].address_components[1],
            geometry: response.data.results[0].geometry,
            formatted_address: response.data.results[0].formatted_address // First result is usually the most relevant
        };
        return (0, response_1.sendSuccessResponse)(res, 200, address, "Current address fetched.");
    }
    catch (error) {
        const errorData = ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error;
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Failed to fetch address.", errorData));
    }
}));
//get coordinates from zipcode
exports.getCoordinatesFromZip = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { zipCode } = req.query;
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!zipCode) {
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "ZIP code is required.", [], null));
    }
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zipCode}&key=${apiKey}`;
    try {
        const response = yield axios_1.default.get(url);
        if (!response.data.results || response.data.results.length === 0) {
            throw new ApisErrors_1.ApiError(400, "No coordinates found for the given ZIP code.", [], response.data);
        }
        const location = response.data.results[0];
        const coordinates = {
            latitude: location.geometry.location.lat,
            longitude: location.geometry.location.lng,
            formattedAddress: location.formatted_address
        };
        return (0, response_1.sendSuccessResponse)(res, 200, coordinates, "Coordinates fetched successfully.");
    }
    catch (error) {
        const errorData = ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message || error;
        return (0, response_1.sendErrorResponse)(res, new ApisErrors_1.ApiError(400, "Failed to fetch coordinates.", errorData));
    }
}));
