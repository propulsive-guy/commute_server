"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSocketMap = exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const rideRoutes_1 = __importDefault(require("./routes/rideRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const mapRoutes_1 = __importDefault(require("./routes/mapRoutes"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Init Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)());
// Create HTTP server and attach Socket.IO
const server = http_1.default.createServer(app);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    },
    transports: ['websocket'], // Force websocket
});
exports.userSocketMap = new Map();
exports.io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('register', (userId) => {
        if (userId) {
            exports.userSocketMap.set(userId, socket.id);
            console.log(`User ${userId} registered with socket ${socket.id}`);
        }
    });
    socket.on('disconnect', () => {
        for (const [userId, socketId] of exports.userSocketMap.entries()) {
            if (socketId === socket.id) {
                exports.userSocketMap.delete(userId);
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    });
});
// Define Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/rides', rideRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/maps', mapRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Ride Connect API is running');
});
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ride-connect';
mongoose_1.default.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch((err) => console.error('MongoDB connection error:', err));
// Use server.listen instead of app.listen
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
