"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../middlewares/auth/userAuth");
const service_controller_1 = require("../controller/service.controller");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file
router.route('/').post((0, userAuth_1.verifyUserType)(['Customer']), service_controller_1.addService);
router.route('/get-pending-service').get(service_controller_1.getPendingServiceRequest);
router.route('/nearby-services-request').get((0, userAuth_1.verifyUserType)(['ServiceProvider']), service_controller_1.fetchServiceRequest);
router.route("/c/:serviceId").delete((0, userAuth_1.verifyUserType)(['SuperAdmin']), service_controller_1.deleteService).put((0, userAuth_1.verifyUserType)(['SuperAdmin', 'ServiceProvider']), service_controller_1.updateServiceRequest);
exports.default = router;
