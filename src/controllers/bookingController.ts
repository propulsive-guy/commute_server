import { Request, Response } from 'express';
import Booking from '../models/Booking';
import Ride from '../models/Ride';
import { sendPushNotification } from '../pushService';
import { io, userSocketMap } from '../index';


interface AuthRequest extends Request {
    user?: {
        id: string;
    };
}

// Create a new booking request
export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { rideId, seats, totalPrice } = req.body;
        const passengerId = req.user?.id;

        if (!passengerId) {
            res.status(401).json({ msg: 'User not authorized' });
            return;
        }

        const ride = await Ride.findById(rideId);
        if (!ride) {
            res.status(404).json({ msg: 'Ride not found' });
            return;
        }

        if (ride.rider.toString() === passengerId) {
            res.status(400).json({ msg: 'Cannot book your own ride' });
            return;
        }

        const booking = new Booking({
            ride: rideId,
            passenger: passengerId,
            seats: seats || 1,
            totalPrice,
            status: 'pending'
        });

        await booking.save();

        // Push notification and socket to rider
        sendPushNotification(
            ride.rider.toString(),
            'New Booking Request',
            `You have a new booking request from a pillion rider.`
        );

        const riderSocketId = userSocketMap.get(ride.rider.toString());
        if (riderSocketId) {
            const populated = await Booking.findById(booking._id)
                .populate('passenger', 'name email phone photoUrl')
                .populate('ride');
            io.to(riderSocketId).emit('new-booking-request', populated);
        }

        // Return populated booking with rider info
        const populatedBooking = await Booking.findById(booking._id)
            .populate('passenger', 'name email phone photoUrl')
            .populate({
                path: 'ride',
                populate: { path: 'rider', select: 'name email phone rating photoUrl' }
            });

        res.status(201).json(populatedBooking);
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// Get bookings for the current user (as passenger)
export const getMyBookings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ msg: 'User not authorized' });
            return;
        }
        const bookings = await Booking.find({ passenger: userId })
            .populate('ride')
            .populate({
                path: 'ride',
                populate: { path: 'rider', select: 'name email phone photoUrl' }
            })
            .sort({ createdAt: -1 });

        res.json(bookings);
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// Get bookings for a specific ride (as rider) - incoming requests
export const getRideRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ msg: 'User not authorized' });
            return;
        }

        const myRides = await Ride.find({ rider: userId }).select('_id');
        const rideIds = myRides.map(r => r._id);

        const requests = await Booking.find({ ride: { $in: rideIds } })
            .populate('passenger', 'name email phone photoUrl')
            .populate('ride')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// Update booking status (Accept/Reject)
// On accept → auto-request location sharing
export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
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

        const booking = await Booking.findById(bookingId).populate('ride');

        if (!booking) {
            res.status(404).json({ msg: 'Booking not found' });
            return;
        }

        const riderId = (booking.ride as any).rider?.toString();
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
        } else {
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
            await Ride.findByIdAndUpdate(booking.ride._id, { status: 'booked' });
        }

        // Return populated booking
        const populated = await Booking.findById(bookingId)
            .populate('passenger', 'name email phone photoUrl')
            .populate('ride');

        // Push notification and socket to passenger
        const statusText = status === 'accepted' ? 'Accepted' : (status === 'rejected' ? 'Declined' : 'Cancelled');
        sendPushNotification(
            passengerId,
            `Ride Request ${statusText}`,
            `Your ride request has been ${statusText.toLowerCase()} by the rider.`
        );

        const passengerSocketId = userSocketMap.get(passengerId);
        if (passengerSocketId) {
            io.to(passengerSocketId).emit('booking-status-updated', populated);
        }

        res.json(populated);
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// Pillion accepts location sharing
export const acceptLocationSharing = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const bookingId = req.params.id;
        const userId = req.user?.id;

        const booking = await Booking.findById(bookingId);
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
        const riderId = (booking.ride as any).rider?.toString() || ((await booking.populate('ride')).ride as any).rider.toString();
        const riderSocketId = userSocketMap.get(riderId);
        if (riderSocketId) {
            io.to(riderSocketId).emit('location-sharing-accepted', { bookingId: booking._id });
        }

        res.json({ msg: 'Location sharing accepted', booking });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// Pillion updates their live location
export const updatePillionLocation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const bookingId = req.params.id;
        const userId = req.user?.id;
        const { lat, lng } = req.body;

        const booking = await Booking.findById(bookingId);
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
        const riderId = (booking.ride as any).rider?.toString() || ((await booking.populate('ride')).ride as any).rider.toString();
        const riderSocketId = userSocketMap.get(riderId);
        if (riderSocketId) {
            io.to(riderSocketId).emit('pillion-location-update', {
                bookingId: booking._id,
                location: booking.pillionLocation
            });
        }

        res.json({ msg: 'Location updated' });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};

// Rider gets pillion's location
export const getPillionLocation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const bookingId = req.params.id;
        const userId = req.user?.id;

        const booking = await Booking.findById(bookingId).populate('ride');
        if (!booking) {
            res.status(404).json({ msg: 'Booking not found' });
            return;
        }

        const riderId = (booking.ride as any).rider?.toString();
        if (!riderId || riderId !== userId) {
            res.status(401).json({ msg: 'Only the rider can view pillion location' });
            return;
        }

        res.json({
            locationSharingAccepted: booking.locationSharingAccepted,
            pillionLocation: booking.pillionLocation,
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};
