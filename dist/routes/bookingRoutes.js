"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookingController_1 = require("../controllers/bookingController");
const authMiddleware_1 = __importDefault(require("../middleware/authMiddleware"));
const router = express_1.default.Router();
// Core booking routes
router.post('/', authMiddleware_1.default, bookingController_1.createBooking);
router.get('/my-bookings', authMiddleware_1.default, bookingController_1.getMyBookings);
router.get('/requests', authMiddleware_1.default, bookingController_1.getRideRequests);
router.put('/:id/status', authMiddleware_1.default, bookingController_1.updateBookingStatus);
// Location sharing routes
router.put('/:id/accept-location', authMiddleware_1.default, bookingController_1.acceptLocationSharing);
router.put('/:id/update-location', authMiddleware_1.default, bookingController_1.updatePillionLocation);
router.get('/:id/pillion-location', authMiddleware_1.default, bookingController_1.getPillionLocation);
exports.default = router;
