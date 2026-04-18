describe('Auth lazy initialization', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-test?replicaSet=rs0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.FINE_BLOCK_THRESHOLD = '50000';
    process.env.HOLD_EXPIRY_HOURS = '48';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    jest.resetModules();
  });

  it('does not create AuthService or access Redis during module import', async () => {
    const getRedisClient = jest.fn();
    const authServiceConstructor = jest.fn();

    jest.doMock('../../src/config/redis', () => ({
      connectToRedis: jest.fn(),
      closeRedisConnection: jest.fn(),
      getRedisStatus: jest.fn(() => 'connected'),
      getRedisClient,
    }));
    jest.doMock('../../src/modules/member/auth.service', () => ({
      AuthService: authServiceConstructor,
    }));
    jest.doMock('../../src/modules/member/member.repository', () => ({
      memberRepository: {
        findMemberById: jest.fn(),
      },
    }));

    await import('../../src/modules/member/auth.controller');
    await import('../../src/common/middleware/authenticate');

    expect(authServiceConstructor).not.toHaveBeenCalled();
    expect(getRedisClient).not.toHaveBeenCalled();
  });
});
