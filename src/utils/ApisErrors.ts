class ApiError extends Error {
    statusCode: number;
    data: any;
    success: boolean;
    errors: any[];

    constructor(
        statusCode: number,
        message: string = "Something Went Wrong",
        errors: any[] = [],
        data: any = null,  // Ensure 'data' is not defaulting to null when provided
        stack: string = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = data;  // Assign the 'data' argument properly here
        this.success = false;
        this.errors = errors;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };

