import { Response } from "express";
import { ApiError } from "./ApisErrors";
import { ApiResponse } from "./ApiResponse";

export const sendSuccessResponse  = <T>(
    res: Response,
    statusCode: number,
    data:T,
    message:string = "Success",
)=>{
    const response = new ApiResponse(statusCode,data,message);
    return res.status(response.statusCode).json(response);
};

export const sendErrorResponse = (
    res: Response,
    error: ApiError
) => {
    return res.status(error.statusCode).json({
        statusCode: error.statusCode,
        success: error.success,
        message: error.message,
        errors: error.errors
    });
};