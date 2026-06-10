import express from 'express';
import passport from 'passport';
import { getMe, devLogin, googleCallbackSuccess, updateProfile } from '../controllers/authController.js';
import protect from '../middleware/auth.js';

const router = express.Router();


router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=auth_failed', session: false }),
  googleCallbackSuccess
);


router.get('/me', protect, getMe);


router.put('/profile', protect, updateProfile);


router.post('/dev-login', protect ? devLogin : devLogin); 

export default router;
