import express from 'express';
import { getDirections, getAutocompleteSuggestions, getPlaceDetails, geocodeAddress } from '../controllers/mapController';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

// Proxy endpoints for Google Maps
router.get('/directions', authMiddleware, getDirections);
router.get('/suggestions', authMiddleware, getAutocompleteSuggestions);
router.get('/details', authMiddleware, getPlaceDetails);
router.get('/geocode', authMiddleware, geocodeAddress);

export default router;
