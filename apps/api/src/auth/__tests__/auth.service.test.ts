import { AuthService } from '../auth.service';

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, unknown> = {
      AUTH_COOKIE_NAME: 'storycraft_session',
      AUTH_SESSION_TTL_SECONDS: 3600,
      NODE_ENV: 'test',
      WEB_ORIGIN: 'http://localhost:3000',
    };

    return values[key];
  }),
};

const mockJwt = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockPrisma = {
  authSession: {
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
};

const mockUsers = {
  toPublicUser: jest.fn((user: unknown) => user),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      mockConfig as never,
      mockJwt as never,
      mockPrisma as never,
      mockUsers as never,
    );
  });

  it('creates a persisted revocable session before signing the JWT', async () => {
    mockJwt.signAsync.mockResolvedValue('jwt-token');

    const token = await service.createSessionToken('user-1');

    expect(token).toBe('jwt-token');
    expect(mockPrisma.authSession.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        tokenId: expect.any(String),
        expiresAt: expect.any(Date),
      },
    });
    expect(mockJwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      jti: expect.any(String),
    });
  });

  it('returns null when the persisted session is revoked', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'token-1' });
    mockPrisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.getUserFromRequest({
        cookies: { storycraft_session: 'jwt-token' },
      } as never),
    ).resolves.toBeNull();
    expect(mockUsers.toPublicUser).not.toHaveBeenCalled();
  });

  it('loads the user and validates the session in one database query', async () => {
    const user = { id: 'user-1', email: 'user@example.com' };
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'token-1' });
    mockPrisma.user.findFirst.mockResolvedValue(user);

    await expect(
      service.getUserFromRequest({
        cookies: { storycraft_session: 'jwt-token' },
      } as never),
    ).resolves.toEqual(user);
    expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'user-1',
        authSessions: {
          some: {
            tokenId: 'token-1',
            revokedAt: null,
            expiresAt: { gt: expect.any(Date) },
          },
        },
      },
    });
    expect(mockUsers.toPublicUser).toHaveBeenCalledWith(user);
  });

  it('revokes the current session from a request cookie', async () => {
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'token-1' });

    await service.revokeSessionFromRequest({
      cookies: { storycraft_session: 'jwt-token' },
    } as never);

    expect(mockPrisma.authSession.updateMany).toHaveBeenCalledWith({
      where: {
        tokenId: 'token-1',
        revokedAt: null,
      },
      data: {
        revokedAt: expect.any(Date),
      },
    });
  });
});
