import express from 'express';
import {
    createBooking, getMyBookings, getRideRequests, updateBookingStatus,
    acceptLocationSharing, updatePillionLocation, getPillionLocation
} from '../controllers/bookingController';
import auth from '../middleware/authMiddleware';

const router = express.Router();

// Core booking routes
router.post('/', auth, createBooking);
router.get('/my-bookings', auth, getMyBookings);
router.get('/requests', auth, getRideRequests);
router.put('/:id/status', auth, updateBookingStatus);

// Location sharing routes
router.put('/:id/accept-location', auth, acceptLocationSharing);
router.put('/:id/update-location', auth, updatePillionLocation);
router.get('/:id/pillion-location', auth, getPillionLocation);

export default router;
