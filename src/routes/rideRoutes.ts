import express from 'express';
import { postRide, searchRides, getAllRides, getMyRides, matchRides } from '../controllers/rideController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', authMiddleware, postRide);      // protected — rider must be logged in
router.post('/match', authMiddleware, matchRides); // route matching for pillions
router.get('/search', searchRides);               // public — pillion can search without auth
router.get('/all', getAllRides);                   // public — pillion can browse
router.get('/my-rides', authMiddleware, getMyRides); // protected

export default router;
