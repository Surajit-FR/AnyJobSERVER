"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../middlewares/auth/userAuth");
const shift_controller_1 = require("../controller/shift.controller");
const IP_middleware_1 = require("../middlewares/IP.middleware");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken);
router.route('/')
    .get(shift_controller_1.fetchShifs)
    .post((0, userAuth_1.verifyUserType)(['SuperAdmin']), IP_middleware_1.captureIPMiddleware, shift_controller_1.addShift);
router.route('/:shiftId')
    .get(shift_controller_1.fetchShiftbyId)
    .patch((0, userAuth_1.verifyUserType)(['SuperAdmin']), IP_middleware_1.captureIPMiddleware, shift_controller_1.updateShift)
    .delete((0, userAuth_1.verifyUserType)(['SuperAdmin']), IP_middleware_1.captureIPMiddleware, shift_controller_1.deleteShift);
exports.default = router;
