"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePushToken = exports.updateProfile = exports.login = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getSecret = () => process.env.JWT_SECRET || 'secret';
const register = async (req, res) => {
    try {
        const { name, email, password, phone, role, aadharNumber, photoUrl } = req.body;
        if (!name || !email || !password || !phone || !role || !aadharNumber || !photoUrl) {
            return res.status(400).json({ msg: 'Please provide all required fields (name, email, password, phone, role, aadharNumber, photoUrl)' });
        }
        let user = await User_1.default.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        user = new User_1.default({ name, email, password, phone, role, aadharNumber, photoUrl });
        await user.save();
        const payload = { id: user.id, role: user.role };
        jsonwebtoken_1.default.sign(payload, getSecret(), { expiresIn: '30d' }, (err, token) => {
            if (err)
                throw err;
            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    aadharNumber: user.aadharNumber,
                    photoUrl: user.photoUrl
                }
            });
        });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        if (user.password !== password) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        const payload = { id: user.id, role: user.role };
        jsonwebtoken_1.default.sign(payload, getSecret(), { expiresIn: '30d' }, (err, token) => {
            if (err)
                throw err;
            res.json({
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    aadharNumber: user.aadharNumber,
                    photoUrl: user.photoUrl
                }
            });
        });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
exports.login = login;
const updateProfile = async (req, res) => {
    try {
        const { name, phone, aadharNumber, photoUrl } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        const updatedUser = await User_1.default.findByIdAndUpdate(userId, { name, phone, aadharNumber, photoUrl }, { new: true }).select('-password');
        res.json(updatedUser);
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
exports.updateProfile = updateProfile;
const updatePushToken = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
        await User_1.default.findByIdAndUpdate(userId, { expoPushToken: token });
        res.json({ msg: 'Push token updated' });
    }
    catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
exports.updatePushToken = updatePushToken;
