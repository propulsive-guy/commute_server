import mongoose, { Schema, Document } from 'mongoose';

export interface IBooking extends Document {
    ride: mongoose.Types.ObjectId;
    passenger: mongoose.Types.ObjectId;
    seats: number;
    totalPrice: number;
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
    // Location sharing
    locationSharingRequested: boolean;
    locationSharingAccepted: boolean;
    pillionLocation: {
        lat: number;
        lng: number;
        updatedAt: Date;
    } | null;
    createdAt: Date;
}

const BookingSchema: Schema = new Schema({
    ride: { type: Schema.Types.ObjectId, ref: 'Ride', required: true },
    passenger: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seats: { type: Number, default: 1 },
    totalPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'cancelled'],
        default: 'pending'
    },
    locationSharingRequested: { type: Boolean, default: false },
    locationSharingAccepted: { type: Boolean, default: false },
    pillionLocation: {
        lat: { type: Number },
        lng: { type: Number },
        updatedAt: { type: Date },
    },
    createdAt: { type: Date, default: Date.now },
});

BookingSchema.index({ ride: 1 });
BookingSchema.index({ passenger: 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);
