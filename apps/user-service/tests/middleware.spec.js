import {
  verifyIsAdmin,
  verifyIsOwnerOrAdmin,
} from '../middleware/basic-access-control.js';

describe('basic-access-control middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      params: {},
      user: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('verifyIsAdmin', () => {
    it('should call next when user is admin', () => {
      mockReq.user = { isAdmin: true };

      verifyIsAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', () => {
      mockReq.user = { isAdmin: false };

      verifyIsAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Not authorized to access this resource',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('verifyIsOwnerOrAdmin', () => {
    it('should call next when user is admin', () => {
      mockReq.user = { id: 'admin1', isAdmin: true };
      mockReq.params = { id: 'user123' };

      verifyIsOwnerOrAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next when user owns the resource', () => {
      mockReq.user = { id: 'user123', isAdmin: false };
      mockReq.params = { id: 'user123' };

      verifyIsOwnerOrAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when user is neither owner nor admin', () => {
      mockReq.user = { id: 'user999', isAdmin: false };
      mockReq.params = { id: 'user123' };

      verifyIsOwnerOrAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Not authorized to access this resource',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
