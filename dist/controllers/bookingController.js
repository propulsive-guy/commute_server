"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPillionLocation = exports.updatePillionLocation = exports.acceptLocationSharing = exports.updateBookingStatus = exports.getRideRequests = exports.getMyBookings = exports.createBooking = void 0;
const Booking_1 = __importDefault(require("../models/Booking"));
const Ride_1 = __importDefault(require("../models/Ride"));
const pushService_1 = require("../pushService");
const index_1 = require("../index");
// Create a new booking request
const createBooking = async (req, res) => {
    try {
        const { rideId, seats, totalPrice } = req.body;
        const passengerId = req.user?.id;
        if (!passengerId) {
            res.status(401).json({ msg: 'User not authorized' });
            return;
        }
        const ride = await Ride_1.default.findById(rideId);
        if (!ride) {
            res.status(404).json({ msg: 'Ride not found' });
            return;
        }
        if (ride.rider.toString() === passengerId) {
            res.status(400).json({ msg: 'Cannot book your own ride' });
            return;
        }
        const booking = new Booking_1.default({
            ride: rideId,
            passenger: passengerId,
            seats: seats || 1,
            totalPrice,
            status: 'pending'
        });
        await booking.save();
        // Push notification and socket to rider
        (0, pushService_1.sendPushNotification)(ride.rider.toString(), 'New Booking Request', `You have a new booking request from a pillion rider.`);
        const riderSocketId = index_1.userSocketMap.get(ride.rider.toString());
        if (riderSocketId) {
            const populated = await Booking_1.default.findById(booking._id)
                .populate('passenger', 'name email phone photoUrl')
                .populate('ride');
            index_1.io.to(riderSocketId).emit('new-booking-request', populated);
        }
        // Return populated booking with rider info
        const populatedBooking = await Booking_1.default.findById(booking._id)
            .populate('passenger', 'name email phone photoUrl')
            .populate({
            path: 'ride',
            populate: { path: 'rider', select: 'name email phone rating photoUrl' }
        });
        res.status(201).json(populatedBooking);
    }
    catch (error) {
        res.status(500).send('Server Error');
    }
};
exports.createBooking = createBooking;
// Get bookings for the current user (as passenger)
const getMyBookings = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ msg: 'User not authorized' });
            return;
        }
        const bookings = await Booking_1.default.find({ passenger: userId })
            .populate('ride')
            .populate({
            path: 'ride',
            populate: { path: 'rider', select: 'name email phone photoUrl' }
        })
            .sort({ createdAt: -1 });
        res.json(bookings);
    }
    catch (error) {
        res.status(500).send('Server Error');
    }
};
exports.getMyBookings = getMyBookings;
// Get bookings for a specific ride (as rider) - incoming requests
const getRideRequests = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ msg: 'User not authorized' });
            return;
        }
        const myRides = await Ride_1.default.find({ rider: userId }).select('_id');
        const rideIds = myRides.map(r => r._id);
        const requests = await Booking_1.default.find({ ride: { $in: rideIds } })
            .populate('passenger', 'name email phone photoUrl')
            .populate('ride')
            .sort({ createdAt: -1 });
        res.json(requests);
    }
    catch (error) {
        res.status(500).send('Server Error');
    }
};
exports.getRideRequests = getRideRequests;
// Update booking status (Accept/Reject)
// On accept → auto-request location sharing
const updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const bookingId = req.params.id;
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ msg: 'User not authorized' });
            return;
        }
        if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
            res.status(400).json({ msg: 'Invalid status' });
            return;
        }
        const booking = await Booking_1.default.findById(bookingId).populate('ride');
        if (!booking) {
            res.status(404).json({ msg: 'Booking not found' });
            return;
        }
        const riderId = booking.ride.rider?.toString();
        const passengerId = booking.passenger.toString();
        if (!riderId) {
            res.status(400).json({ msg: 'Rider not found for this booking' });
            return;
        }
        if (status === 'cancelled') {
            if (passengerId !== userId && riderId !== userId) {
                res.status(401).json({ msg: 'Not authorized' });
                return;
            }
        }
        else {
            if (riderId !== userId) {
                res.status(401).json({ msg: 'Only rider can accept/reject' });
                return;
            }
        }
        booking.status = status;
        // Auto-request location sharing when rider accepts
        if (status === 'accepted') {
            booking.locationSharingRequested = true;
        }
        await booking.save();
        // Mark ride as booked when rider accepts
        if (status === 'accepted') {
            await Ride_1.default.findByIdAndUpdate(booking.ride._id, { status: 'booked' });
        }
        // Return populated booking
        const populated = await Booking_1.default.findById(bookingId)
            .populate('passenger', 'name email phone photoUrl')
            .populate('ride');
        // Push notification and socket to passenger
        const statusText = status === 'accepted' ? 'Accepted' : (status === 'rejected' ? 'Declined' : 'Cancelled');
        (0, pushService_1.sendPushNotification)(passengerId, `Ride Request ${statusText}`, `Your ride request has been ${statusText.toLowerCase()} by the rider.`);
        const passengerSocketId = index_1.userSocketMap.get(passengerId);
        if (passengerSocketId) {
            index_1.io.to(passengerSocketId).emit('booking-status-updated', populated);
        }
        res.json(populated);
    }
    catch (error) {
        res.status(500).send('Server Error');
    }
};
exports.updateBookingStatus = updateBookingStatus;
// Pillion accepts location sharing
const acceptLocationSharing = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const userId = req.user?.id;
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            res.status(404).json({ msg: 'Booking not found' });
            return;
        }
        if (booking.passenger.toString() !== userId) {
            res.status(401).json({ msg: 'Only the passenger can accept location sharing' });
            return;
        }
        if (booking.status !== 'accepted') {
            res.status(400).json({ msg: 'Booking must be accepted first' });
            return;
        }
        booking.locationSharingAccepted = true;
        await booking.save();
        // Notify rider via socket
        const riderId = booking.ride.rider?.toString() || (await booking.populate('ride')).ride.rider.toString();
        const riderSocketId = index_1.userSocketMap.get(riderId);
        if (riderSocketId) {
            index_1.io.to(riderSocketId).emit('location-sharing-accepted', { bookingId: booking._id });
        }
        res.json({ msg: 'Location sharing accepted', booking });
    }
    catch (error) {
        res.status(500).send('Server Error');
    }
};
exports.acceptLocationSharing = acceptLocationSharing;
// Pillion updates their live location
const updatePillionLocation = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const userId = req.user?.id;
        const { lat, lng } = req.body;
        const booking = await Booking_1.default.findById(bookingId);
        if (!booking) {
            res.status(404).json({ msg: 'Booking not found' });
            return;
        }
        if (booking.passenger.toString() !== userId) {
            res.status(401).json({ msg: 'Only the passenger can share location' });
            return;
        }
        if (!booking.locationSharingAccepted) {
            res.status(400).json({ msg: 'Location sharing not accepted yet' });
            return;
        }
        booking.pillionLocation = { lat, lng, updatedAt: new Date() };
        await booking.save();
        // Notify rider via socket
        const riderId = booking.ride.rider?.toString() || (await booking.populate('ride')).ride.rider.toString();
        const riderSocketId = index_1.userSocketMap.get(riderId);
        if (riderSocketId) {
            index_1.io.to(riderSocketId).emit('pillion-location-update', {
                bookingId: booking._id,
                location: booking.pillionLocation
            });
        }
        res.json({ msg: 'Location updated' });
    }
    catch (error) {
        res.status(500).send('Server Error');
    }
};
exports.updatePillionLocation = updatePillionLocation;
// Rider gets pillion's location
const getPillionLocation = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const userId = req.user?.id;
        const booking = await Booking_1.default.findById(bookingId).populate('ride');
        if (!booking) {
            res.status(404).json({ msg: 'Booking not found' });
            return;
        }
        const riderId = booking.ride.rider?.toString();
        if (!riderId || riderId !== userId) {
            res.status(401).json({ msg: 'Only the rider can view pillion location' });
            return;
        }
        res.json({
            locationSharingAccepted: booking.locationSharingAccepted,
            pillionLocation: booking.pillionLocation,
        });
    }
    catch (error) {
        res.status(500).send('Server Error');
    }
};
exports.getPillionLocation = getPillionLocation;
