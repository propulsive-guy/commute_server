import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import jwt from 'jsonwebtoken';

const getSecret = () => process.env.JWT_SECRET || 'secret';

export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, phone, role, aadharNumber, photoUrl } = req.body;

        if (!name || !email || !password || !phone || !role || !aadharNumber || !photoUrl) {
            return res.status(400).json({ msg: 'Please provide all required fields (name, email, password, phone, role, aadharNumber, photoUrl)' });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ name, email, password, phone, role, aadharNumber, photoUrl });
        await user.save();

        const payload = { id: user.id, role: user.role };

        jwt.sign(payload, getSecret(), { expiresIn: '30d' }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                user: {
                    id: user!.id,
                    name: user!.name,
                    email: user!.email,
                    phone: user!.phone,
                    role: user!.role,
                    aadharNumber: user!.aadharNumber,
                    photoUrl: user!.photoUrl
                }
            });
        });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        if (user.password !== password) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { id: user.id, role: user.role };

        jwt.sign(payload, getSecret(), { expiresIn: '30d' }, (err, token) => {
            if (err) throw err;
            res.json({
                token,
                user: {
                    id: user!.id,
                    name: user!.name,
                    email: user!.email,
                    phone: user!.phone,
                    role: user!.role,
                    aadharNumber: user!.aadharNumber,
                    photoUrl: user!.photoUrl
                }
            });
        });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

export const updateProfile = async (req: any, res: Response) => {
    try {
        const { name, phone, aadharNumber, photoUrl } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, phone, aadharNumber, photoUrl },
            { new: true }
        ).select('-password');

        res.json(updatedUser);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

export const updatePushToken = async (req: any, res: Response) => {
    try {
        const { token } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await User.findByIdAndUpdate(userId, { expoPushToken: token });
        res.json({ msg: 'Push token updated' });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
