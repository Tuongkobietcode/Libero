import type { Request, Response } from 'express';

import { AuthenticationError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { env } from '../../config/env';
import { getRedisClient } from '../../config/redis';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema } from './auth.validator';
import { memberRepository } from './member.repository';

const REFRESH_COOKIE_NAME = 'refreshToken';
let authService: AuthService | null = null;

function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService(memberRepository, getRedisClient());
  }

  return authService;
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/api/v1/auth',
    maxAge: env.JWT_REFRESH_TTL * 1000,
  };
}

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const input = loginSchema.parse(req.body);
    const result = await getAuthService().login(input);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  }

  async register(req: Request, res: Response): Promise<void> {
    const input = registerSchema.parse(req.body);
    const result = await getAuthService().register(input);

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

    if (!rawRefreshToken) {
      throw new AuthenticationError(ERR.AUTH_REFRESH_INVALID, 401, 'Refresh token cookie is required');
    }

    const result = await getAuthService().refreshTokens(rawRefreshToken);

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());
    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

    if (!rawRefreshToken) {
      throw new AuthenticationError(ERR.AUTH_REFRESH_INVALID, 401, 'Refresh token cookie is required');
    }

    await getAuthService().logout(rawRefreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
    res.status(200).json({
      success: true,
      data: {
        success: true,
      },
    });
  }
}

export const authController = new AuthController();
