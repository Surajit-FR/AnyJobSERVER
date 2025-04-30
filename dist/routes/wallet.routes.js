"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wallet_controller_1 = require("../controller/wallet.controller");
const userAuth_1 = require("../middlewares/auth/userAuth");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken);
router.route('/fetch-wallet-balance').get(wallet_controller_1.fetchWalletBalance);
router.route('/fetch-transactions').get(wallet_controller_1.fetchTransaction);
exports.default = router;
