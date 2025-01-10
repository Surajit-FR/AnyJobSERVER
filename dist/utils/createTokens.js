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
exports.generateAccessAndRefreshToken = void 0;
const ApisErrors_1 = require("./ApisErrors");
const user_model_1 = __importDefault(require("../models/user.model"));
const generateAccessAndRefreshToken = (res, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield user_model_1.default.findById(userId);
        const accessToken = user === null || user === void 0 ? void 0 : user.generateAccessToken();
        const refreshToken = user === null || user === void 0 ? void 0 : user.generateRefreshToken();
        if (!user) {
            throw new ApisErrors_1.ApiError(400, "User Not Found");
        }
        user.refreshToken = refreshToken;
        yield (user === null || user === void 0 ? void 0 : user.save({ validateBeforeSave: false }));
        return { accessToken, refreshToken };
    }
    catch (err) {
        throw new ApisErrors_1.ApiError(500, "Something went wrong while generating refresh and access token");
    }
    ;
});
exports.generateAccessAndRefreshToken = generateAccessAndRefreshToken;
