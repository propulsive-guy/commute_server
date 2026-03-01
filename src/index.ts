import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes';
import rideRoutes from './routes/rideRoutes';
import bookingRoutes from './routes/bookingRoutes';
import mapRoutes from './routes/mapRoutes';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Init Middleware
app.use(express.json());
app.use(cors());

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
export const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket'], // Force websocket
});

export const userSocketMap = new Map<string, string>();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register', (userId: string) => {
        if (userId) {
            userSocketMap.set(userId, socket.id);
            console.log(`User ${userId} registered with socket ${socket.id}`);
        }
    });

    socket.on('disconnect', () => {
        for (const [userId, socketId] of userSocketMap.entries()) {
            if (socketId === socket.id) {
                userSocketMap.delete(userId);
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    });
});

// Define Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/maps', mapRoutes);

app.get('/', (req, res) => {
    res.send('Ride Connect API is running');
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ride-connect';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err: any) => console.error('MongoDB connection error:', err));

// Use server.listen instead of app.listen
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
