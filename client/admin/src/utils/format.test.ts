import { describe, expect, it } from 'vitest';

import { extractErrorMessage } from './format';

describe('extractErrorMessage', () => {
  it('formats validation field errors from the API payload', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'ERR_COMMON_VALIDATION',
            message: 'Request validation failed',
            details: {
              issues: {
                fieldErrors: {
                  email: ['Invalid email'],
                  password: ['Must contain uppercase', 'Must contain number'],
                },
              },
            },
          },
        },
      },
    };

    expect(extractErrorMessage(error)).toBe(
      'Request validation failed:\n- email: Invalid email\n- password: Must contain uppercase, Must contain number',
    );
  });

  it('keeps the existing API message fallback for non-validation errors', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'ERR_AUTH_INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
      },
    };

    expect(extractErrorMessage(error)).toBe('Invalid email or password');
  });
});
