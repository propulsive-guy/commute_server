import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: string;
    email: string;
    phone: string;
    password?: string;
    role: 'rider' | 'pillion';
    rating: number;
    expoPushToken?: string;
    aadharNumber?: string;
    photoUrl?: string;
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['rider', 'pillion'], default: 'pillion' },
    rating: { type: Number, default: 5 },
    expoPushToken: { type: String },
    aadharNumber: { type: String, required: true },
    photoUrl: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>('User', UserSchema);
