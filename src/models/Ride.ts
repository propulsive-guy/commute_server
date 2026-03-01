import mongoose, { Schema, Document } from 'mongoose';

export interface IRide extends Document {
    rider: mongoose.Types.ObjectId;
    source: {
        type: string;
        coordinates: number[]; // [longitude, latitude]
        address?: string;
    };
    destination: {
        type: string;
        coordinates: number[];
        address?: string;
    };
    price: number;
    distance?: number; // km
    duration?: number; // minutes
    status: 'open' | 'booked' | 'completed' | 'cancelled';
    createdAt: Date;
}

const RideSchema: Schema = new Schema({
    rider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true },
        address: String,
    },
    destination: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true },
        address: String,
    },
    price: { type: Number, required: true },
    distance: { type: Number }, // km
    duration: { type: Number }, // minutes
    status: {
        type: String,
        enum: ['open', 'booked', 'completed', 'cancelled'],
        default: 'open'
    },
    createdAt: { type: Date, default: Date.now },
});

// Create 2dsphere index on source (and arguably destination) for geospatial queries
RideSchema.index({ source: '2dsphere' });
RideSchema.index({ destination: '2dsphere' });
RideSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IRide>('Ride', RideSchema);
