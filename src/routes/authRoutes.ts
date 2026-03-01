import express from 'express';
import { register, login, updatePushToken, updateProfile } from '../controllers/authController';
import auth from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', auth, updateProfile);
router.put('/push-token', auth, updatePushToken);

export default router;
