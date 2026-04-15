const jwt = require('jsonwebtoken');

class AuthService {
  constructor(jwtSecret) {
    this.jwtSecret = jwtSecret;
  }

  generateToken(userId) {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: '24h' });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      return null;
    }
  }
}

describe('AuthService', () => {
  let authService;
  const testSecret = 'test-secret-key';

  beforeEach(() => {
    authService = new AuthService(testSecret);
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const userId = 'user123';
      const token = authService.generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should encode the userId in the token', () => {
      const userId = 'user456';
      const token = authService.generateToken(userId);
      const decoded = jwt.verify(token, testSecret);

      expect(decoded.userId).toBe(userId);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const userId = 'user789';
      const token = authService.generateToken(userId);
      const result = authService.verifyToken(token);

      expect(result).not.toBeNull();
      expect(result.userId).toBe(userId);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      const result = authService.verifyToken(invalidToken);

      expect(result).toBeNull();
    });

    it('should return null for tampered token', () => {
      const userId = 'user999';
      const token = authService.generateToken(userId);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      const result = authService.verifyToken(tamperedToken);

      expect(result).toBeNull();
    });
  });
});

module.exports = AuthService;
