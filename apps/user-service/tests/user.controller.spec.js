class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  async getUser(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async createUser(req, res) {
    try {
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const user = await this.userService.createUser({ email, username, password });
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

describe('UserController', () => {
  let userController;
  let mockUserService;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockUserService = {
      getUserById: jest.fn(),
      createUser: jest.fn()
    };

    userController = new UserController(mockUserService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user123', name: 'John Doe', email: 'john@example.com' };
      mockUserService.getUserById.mockResolvedValue(mockUser);

      mockReq = { params: { id: 'user123' } };

      await userController.getUser(mockReq, mockRes);

      expect(mockUserService.getUserById).toHaveBeenCalledWith('user123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });

    it('should return 404 when user not found', async () => {
      mockUserService.getUserById.mockResolvedValue(null);

      mockReq = { params: { id: 'user123' } };

      await userController.getUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should return 500 on service error', async () => {
      mockUserService.getUserById.mockRejectedValue(new Error('Database error'));

      mockReq = { params: { id: 'user123' } };

      await userController.getUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const mockUser = { id: 'user123', email: 'john@example.com', username: 'john' };
      mockUserService.createUser.mockResolvedValue(mockUser);

      mockReq = {
        body: { email: 'john@example.com', username: 'john', password: 'password123' }
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });

    it('should return 400 when missing required fields', async () => {
      mockReq = {
        body: { email: 'john@example.com' } // missing username and password
      };

      await userController.createUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
    });
  });
});

module.exports = UserController;
