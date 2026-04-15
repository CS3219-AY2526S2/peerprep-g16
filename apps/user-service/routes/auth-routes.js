import express from 'express';

import {
  handleLogin,
  handleVerifyToken,
  handleRefreshToken,
} from '../controller/auth-controller.js';
import { verifyAccessToken } from '../middleware/basic-access-control.js';

const router = express.Router();

router.post('/login', handleLogin);

router.get('/verify-token', verifyAccessToken, handleVerifyToken);

router.post('/refresh', handleRefreshToken);

export default router;
