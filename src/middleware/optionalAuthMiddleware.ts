import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: any;
}

const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return next();
    }

    try {
        const secret = process.env.JWT_SECRET || 'secret';
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (err) {
        // If token is invalid, just proceed without user info
        next();
    }
};

export default optionalAuth;
