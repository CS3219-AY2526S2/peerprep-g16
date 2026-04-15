import express from 'express';

import {
  createUser,
  deleteUser,
  getAllUsers,
  getUser,
  getUserAttempts,
  getUserHistory,
  updateUser,
  updateUserPrivilege,
  getUserAttemptById,
} from '../controller/user-controller.js';

import {
  verifyAccessToken,
  verifyIsAdmin,
  verifyIsOwnerOrAdmin,
} from '../middleware/basic-access-control.js';

const router = express.Router();

router.get('/', verifyAccessToken, verifyIsAdmin, getAllUsers);

router.patch(
  '/:id/privilege',
  verifyAccessToken,
  verifyIsAdmin,
  updateUserPrivilege,
);

router.post('/', createUser);

// Internal route — no auth, used by Collaboration Service to build question exclude list
router.get('/:id/history', getUserHistory);

router.get(
  '/:id/attempts',
  verifyAccessToken,
  verifyIsOwnerOrAdmin,
  getUserAttempts,
);

router.get(
  '/:id/attempts/:attemptId',
  verifyAccessToken,
  verifyIsOwnerOrAdmin,
  getUserAttemptById,
);

router.get('/:id', verifyAccessToken, verifyIsOwnerOrAdmin, getUser);

router.patch('/:id', verifyAccessToken, verifyIsOwnerOrAdmin, updateUser);

router.delete('/:id', verifyAccessToken, verifyIsOwnerOrAdmin, deleteUser);

export default router;
