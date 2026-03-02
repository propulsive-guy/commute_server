import express from 'express';
import { postRide, searchRides, getAllRides, getMyRides, matchRides } from '../controllers/rideController';
import authMiddleware from '../middleware/authMiddleware';
import optionalAuthMiddleware from '../middleware/optionalAuthMiddleware';

const router = express.Router();

router.post('/', authMiddleware, postRide);      // protected — rider must be logged in
router.post('/match', authMiddleware, matchRides); // route matching for pillions
router.get('/search', optionalAuthMiddleware, searchRides);               // public (with optional filter)
router.get('/all', optionalAuthMiddleware, getAllRides);                   // public (with optional filter)
router.get('/my-rides', authMiddleware, getMyRides); // protected

export default router;
