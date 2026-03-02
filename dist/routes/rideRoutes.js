"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rideController_1 = require("../controllers/rideController");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const optionalAuthMiddleware_1 = __importDefault(require("../middleware/optionalAuthMiddleware"));
const router = express_1.default.Router();
router.post('/', authMiddleware_1.default, rideController_1.postRide); // protected — rider must be logged in
router.post('/match', authMiddleware_1.default, rideController_1.matchRides); // route matching for pillions
router.get('/search', optionalAuthMiddleware_1.default, rideController_1.searchRides); // public (with optional filter)
router.get('/all', optionalAuthMiddleware_1.default, rideController_1.getAllRides); // public (with optional filter)
router.get('/my-rides', authMiddleware_1.default, rideController_1.getMyRides); // protected
exports.default = router;
