"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ApisErrors_1 = require("../../utils/ApisErrors");
const response_1 = require("../../utils/response");
// Define the middleware function
const ModelAuth = (validator) => {
    return (req, res, next) => {
        const { error, value } = validator(req.body);
        // console.log(req.body);
        if (error) {
            // Create an ApiError instance for validation errors
            const errorResponse = new ApisErrors_1.ApiError(400, "Validation Error", error.details.map(detail => ({
                message: detail.message,
                path: detail.path
            })));
            return (0, response_1.sendErrorResponse)(res, errorResponse);
        }
        // Attach validated body to request object
        req.validatedBody = value;
        next();
    };
};
exports.default = ModelAuth;
