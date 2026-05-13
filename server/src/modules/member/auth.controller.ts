import type { Request, Response } from 'express';

import { AuthenticationError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { env } from '../../config/env';
import { getRedisClient } from '../../config/redis';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema } from './auth.validator';
import { memberRepository } from './member.repository';

const LEGACY_REFRESH_COOKIE_NAME = 'refreshToken';
const CLIENT_APP_HEADER = 'x-client-app';
let authService: AuthService | null = null;

function getAuthService(): AuthService {
  if (!authService) {
    authService = new AuthService(memberRepository, getRedisClient());
  }

  return authService;
}

function getClientApp(req: Request): 'reader' | 'admin' | null {
  const raw = req.header(CLIENT_APP_HEADER);

  if (raw === 'reader' || raw === 'admin') {
    return raw;
  }

  return null;
}

function getRefreshCookieName(req: Request): string {
  const app = getClientApp(req);

  return app ? `${app}_refreshToken` : LEGACY_REFRESH_COOKIE_NAME;
}

function readRefreshTokenCookie(req: Request): { name: string; value: string } | null {
  const app = getClientApp(req);
  const cookieName = getRefreshCookieName(req);
  const primary = req.cookies[cookieName] as string | undefined;

  if (primary) {
    return { name: cookieName, value: primary };
  }

  if (app) {
    return null;
  }

  const legacy = req.cookies[LEGACY_REFRESH_COOKIE_NAME] as string | undefined;

  if (legacy) {
    return { name: LEGACY_REFRESH_COOKIE_NAME, value: legacy };
  }

  return null;
}

function clearRefreshCookies(req: Request, res: Response, cookieName?: string): void {
  const options = getRefreshCookieOptions();
  const cookieNames = new Set<string>([cookieName ?? getRefreshCookieName(req)]);

  if (getClientApp(req)) {
    cookieNames.add(LEGACY_REFRESH_COOKIE_NAME);
  }

  for (const name of cookieNames) {
    res.clearCookie(name, options);
  }
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

    const cookieName = getRefreshCookieName(req);
    res.cookie(cookieName, result.refreshToken, getRefreshCookieOptions());

    // Clear legacy shared cookie so old reader/admin sessions don't shadow the per-app cookie.
    if (cookieName !== LEGACY_REFRESH_COOKIE_NAME) {
      clearRefreshCookies(req, res, LEGACY_REFRESH_COOKIE_NAME);
    }

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
    const incoming = readRefreshTokenCookie(req);

    if (!incoming) {
      throw new AuthenticationError(ERR.AUTH_REFRESH_INVALID, 401, 'Refresh token cookie is required');
    }

    const result = await getAuthService().refreshTokens(incoming.value);

    const cookieName = getRefreshCookieName(req);
    res.cookie(cookieName, result.refreshToken, getRefreshCookieOptions());

    if (cookieName !== LEGACY_REFRESH_COOKIE_NAME) {
      clearRefreshCookies(req, res, LEGACY_REFRESH_COOKIE_NAME);
    }

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const incoming = readRefreshTokenCookie(req);

    if (!incoming) {
      clearRefreshCookies(req, res);
      res.status(200).json({
        success: true,
        data: {
          success: true,
        },
      });
      return;
    }

    await getAuthService().logout(incoming.value);

    clearRefreshCookies(req, res, incoming.name);
    res.status(200).json({
      success: true,
      data: {
        success: true,
      },
    });
  }
}

export const authController = new AuthController();
