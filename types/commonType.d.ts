import { promises } from "dns";
import { Request, Response, NextFunction } from "express";
import { NestedPaths } from "mongoose";
import { IUser } from "./schemaTypes";

export type DBInfo = {
    STATUS: string,
    HOST: string,
    DATE_TIME: string,
};
export type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promises<any>;
export type AsyncHandler = (req: Request, res: Response, next: NestedPaths) => Promises<any>;
export interface CustomRequest extends Request {
    user?: IUser
};
