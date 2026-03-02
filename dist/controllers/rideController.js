"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRides = exports.getMyRides = exports.getAllRides = exports.searchRides = exports.postRide = void 0;
const Ride_1 = __importDefault(require("../models/Ride"));
const Booking_1 = __importDefault(require("../models/Booking"));
const index_1 = require("../index");
// ─── Geo helpers ───
/** Haversine distance between two lat/lng points in km */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
/**
 * Minimum distance (km) from point P to line segment A→B.
 * Projects P onto the infinite line through A,B. If the projection falls
 * between A and B, return perpendicular distance; otherwise return distance
 * to the nearest endpoint.
 * Also returns `t` — the fractional position along A→B (0 = at A, 1 = at B).
 */
function pointToSegmentDistance(pLat, pLng, aLat, aLng, bLat, bLng) {
    // Work in flat coordinates (good enough for <50km segments)
    const cosLat = Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
    const ax = aLng * cosLat, ay = aLat;
    const bx = bLng * cosLat, by = bLat;
    const px = pLng * cosLat, py = pLat;
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
        t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t)); // clamp to segment
    }
    // Closest point on segment
    const closestLng = (ax + t * dx) / cosLat;
    const closestLat = ay + t * dy;
    return {
        distance: haversineKm(pLat, pLng, closestLat, closestLng),
        t,
    };
}
/** Normalize longitude to [-180, 180] */
function normalizeLng(lng) {
    return ((lng + 180) % 360 + 360) % 360 - 180;
}
// Post a new ride
const postRide = async (req, res) => {
    try {
        const { source, destination, price, distance, duration } = req.body;
        const userId = req.user.id; // from auth middleware
        // Normalize longitude
        if (source.coordinates) {
            source.coordinates[0] = normalizeLng(source.coordinates[0]);
        }
        if (destination.coordinates) {
            destination.coordinates[0] = normalizeLng(destination.coordinates[0]);
        }
        const newRide = new Ride_1.default({
            rider: userId,
            source,
            destination,
            price,
            distance,
            duration,
            status: 'open'
        });
        const ride = await newRide.save();
        // Broadcast to all connected clients so pillion feeds update live
        const populatedRide = await Ride_1.default.findById(ride._id)
            .populate('rider', 'name email rating photoUrl');
        if (populatedRide) {
            index_1.io.emit('new-ride-posted', populatedRide.toObject());
        }
        res.json(ride);
    }
    catch (err) {
        res.status(500).json({ msg: 'Failed to post ride' });
    }
};
exports.postRide = postRide;
// Search rides - supports both geo and text search
const searchRides = async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 10000, sourceAddress, destAddress } = req.query;
        const userId = req.user?.id;
        let bookedRideIds = [];
        if (userId) {
            const myBookings = await Booking_1.default.find({
                passenger: userId,
                status: { $in: ['pending', 'accepted'] }
            }).select('ride');
            bookedRideIds = myBookings.map(b => b.ride.toString());
        }
        let query = { status: 'open' };
        if (bookedRideIds.length > 0) {
            query._id = { $nin: bookedRideIds };
        }
        // If geo coordinates provided, use $near
        if (longitude && latitude) {
            const lng = normalizeLng(parseFloat(longitude));
            const lat = parseFloat(latitude);
            query.source = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            };
        }
        // Text-based fuzzy search on addresses
        if (sourceAddress) {
            query['source.address'] = { $regex: sourceAddress, $options: 'i' };
        }
        if (destAddress) {
            query['destination.address'] = { $regex: destAddress, $options: 'i' };
        }
        const rides = await Ride_1.default.find(query)
            .populate('rider', 'name email rating photoUrl')
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(rides);
    }
    catch (err) {
        res.status(500).send('Server Error');
    }
};
exports.searchRides = searchRides;
// Get all open rides (posted within last 10 minutes)
const getAllRides = async (req, res) => {
    try {
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        const userId = req.user?.id;
        let bookedRideIds = [];
        if (userId) {
            const myBookings = await Booking_1.default.find({
                passenger: userId,
                status: { $in: ['pending', 'accepted'] }
            }).select('ride');
            bookedRideIds = myBookings.map(b => b.ride.toString());
        }
        let query = { status: 'open', createdAt: { $gte: tenMinAgo } };
        if (bookedRideIds.length > 0) {
            query._id = { $nin: bookedRideIds };
        }
        const rides = await Ride_1.default.find(query)
            .populate('rider', 'name email rating photoUrl')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(rides);
    }
    catch (err) {
        res.status(500).send('Server Error');
    }
};
exports.getAllRides = getAllRides;
// Get rides posted by the authenticated user
const getMyRides = async (req, res) => {
    try {
        const userId = req.user.id;
        const rides = await Ride_1.default.find({ rider: userId })
            .populate('rider', 'name email rating photoUrl')
            .sort({ createdAt: -1 });
        res.json(rides);
    }
    catch (err) {
        res.status(500).send('Server Error');
    }
};
exports.getMyRides = getMyRides;
/**
 * Match rides for a pillion.
 *
 * Algorithm:
 *   For each open ride (Rider: A → B), check if pillion's route (C → D):
 *     1. Pickup C is within THRESHOLD km of the line segment A→B
 *     2. Destination D is within THRESHOLD km of the line segment A→B
 *     3. D projects onto A→B *after* C (tDest >= tPickup), ensuring same direction
 *     4. Pickup C is not past the end of the route (tPickup < 0.95)
 *
 *   This allows matching pillions whose destination is anywhere along
 *   the rider's route, not just near the rider's endpoint.
 *
 * Body: { pickupLat, pickupLng, destLat, destLng, threshold? }
 */
const matchRides = async (req, res) => {
    try {
        const { pickupLat, pickupLng, destLat, destLng, threshold = 0.5 } = req.body;
        if (!pickupLat || !pickupLng || !destLat || !destLng) {
            return res.status(400).json({ msg: 'pickupLat, pickupLng, destLat, destLng are required' });
        }
        const normalizedPickupLng = normalizeLng(Number(pickupLng));
        const normalizedDestLng = normalizeLng(Number(destLng));
        const normalizedPickupLat = Number(pickupLat);
        const normalizedDestLat = Number(destLat);
        const THRESHOLD_KM = Number(threshold);
        // Get open rides posted within last 10 minutes
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        const userId = req.user.id;
        // Find rides this user has already booked (pending or accepted)
        const myBookings = await Booking_1.default.find({
            passenger: userId,
            status: { $in: ['pending', 'accepted'] }
        }).select('ride');
        const bookedRideIds = myBookings.map(b => b.ride.toString());
        const rides = await Ride_1.default.find({
            _id: { $nin: bookedRideIds },
            status: 'open',
            createdAt: { $gte: tenMinAgo }
        })
            .populate('rider', 'name email rating photoUrl')
            .sort({ createdAt: -1 });
        const matched = [];
        for (const ride of rides) {
            // Ride source A and destination B coordinates: [lng, lat]
            const aLng = ride.source.coordinates[0];
            const aLat = ride.source.coordinates[1];
            const bLng = ride.destination.coordinates[0];
            const bLat = ride.destination.coordinates[1];
            // 1. Check pillion pickup (C) distance to route line A→B
            const { distance: pickupDist, t: tPickup } = pointToSegmentDistance(normalizedPickupLat, normalizedPickupLng, aLat, aLng, bLat, bLng);
            if (pickupDist > THRESHOLD_KM)
                continue; // too far from route
            // 2. Pickup must project onto route before the end (t < 0.95)
            if (tPickup > 0.95)
                continue;
            // 3. Check pillion destination (D) distance to route line A→B
            //    This allows D to be anywhere along the route, not just near B
            const { distance: destDist, t: tDest } = pointToSegmentDistance(normalizedDestLat, normalizedDestLng, aLat, aLng, bLat, bLng);
            if (destDist > THRESHOLD_KM)
                continue; // destination too far from route
            // 4. Destination must project AFTER pickup along the route
            //    (pillion must travel in the same direction as the rider)
            if (tDest <= tPickup)
                continue;
            matched.push({ ride: ride.toObject(), pickupDistKm: pickupDist, destDistKm: destDist });
        }
        // Sort by time (newest first)
        matched.sort((a, b) => new Date(b.ride.createdAt).getTime() - new Date(a.ride.createdAt).getTime());
        // Return rides with match quality info
        const result = matched.map(m => ({
            ...m.ride,
            matchInfo: {
                pickupDistKm: Math.round(m.pickupDistKm * 10) / 10,
                destDistKm: Math.round(m.destDistKm * 10) / 10,
            }
        }));
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ msg: 'Failed to match rides' });
    }
};
exports.matchRides = matchRides;
