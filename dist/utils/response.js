"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendErrorResponse = exports.sendSuccessResponse = void 0;
const ApiResponse_1 = require("./ApiResponse");
const sendSuccessResponse = (res, statusCode, data, message = "Success") => {
    const response = new ApiResponse_1.ApiResponse(statusCode, data, message);
    return res.status(response.statusCode).json(response);
};
exports.sendSuccessResponse = sendSuccessResponse;
const sendErrorResponse = (res, error) => {
    const responsePayload = {
        statusCode: error.statusCode,
        success: error.success,
        message: error.message,
        errors: error.errors,
        data: error.data
    };
    // Conditionally add the data field if it exists and is not null
    if (error.data) { // This will check if data exists and is not null/undefined
        responsePayload.data = error.data;
    }
    return res.status(error.statusCode).json(responsePayload);
};
exports.sendErrorResponse = sendErrorResponse;
