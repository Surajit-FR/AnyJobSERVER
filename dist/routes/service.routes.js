"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userAuth_1 = require("../middlewares/auth/userAuth");
const service_controller_1 = require("../controller/service.controller");
const IP_middleware_1 = require("../middlewares/IP.middleware");
const router = express_1.default.Router();
router.use(userAuth_1.VerifyJWTToken); // Apply verifyJWT middleware to all routes in this file
router.route('/')
    .post((0, userAuth_1.verifyUserType)(['Customer']), service_controller_1.addService)
    .get((0, userAuth_1.verifyUserType)(['SuperAdmin']), IP_middleware_1.captureIPMiddleware, service_controller_1.getServiceRequestList);
router.route('/get-accepted-service-request')
    .get(service_controller_1.getAcceptedServiceRequestInJobQueue);
router.route('/get-service-request')
    .get(service_controller_1.getServiceRequestByStatus);
router.route('/get-job-count')
    .get((0, userAuth_1.verifyUserType)(['ServiceProvider', 'TeamLead']), service_controller_1.totalJobCount);
router.route('/nearby-services-request')
    .get((0, userAuth_1.verifyUserType)(['ServiceProvider']), service_controller_1.fetchServiceRequest);
router.route('/assign-job')
    .patch((0, userAuth_1.verifyUserType)(['ServiceProvider', 'TeamLead']), service_controller_1.assignJob);
router.route("/c/:serviceId")
    .get((0, userAuth_1.verifyUserType)(['SuperAdmin', "ServiceProvider", "Customer"]), service_controller_1.fetchSingleServiceRequest)
    .delete((0, userAuth_1.verifyUserType)(['SuperAdmin']), IP_middleware_1.captureIPMiddleware, service_controller_1.deleteService)
    .put((0, userAuth_1.verifyUserType)(['SuperAdmin', 'ServiceProvider']), IP_middleware_1.captureIPMiddleware, service_controller_1.updateServiceRequest)
    .patch((0, userAuth_1.verifyUserType)(["ServiceProvider", 'TeamLead', 'FieldAgent']), service_controller_1.handleServiceRequestState);
exports.default = router;
