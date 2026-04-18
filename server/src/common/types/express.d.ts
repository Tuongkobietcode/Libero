declare module 'node:http' {
  interface IncomingMessage {
    requestId?: string;
  }
}

declare global {
  namespace Express {
    interface User {
      _id: string;
      role: string;
      isBlocked: boolean;
    }

    interface Request {
      requestId: string;
      user?: User;
      cookies: Record<string, string | undefined>;
    }
  }
}

export {};
