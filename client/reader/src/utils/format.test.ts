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

  it('formats validation form errors when field errors are absent', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'COMMON_VALIDATION',
            message: 'Request validation failed',
            details: {
              issues: {
                formErrors: ['Payload must be an object'],
              },
            },
          },
        },
      },
    };

    expect(extractErrorMessage(error)).toBe('Request validation failed:\n- Payload must be an object');
  });

  it('uses friendly Vietnamese messages for known business errors', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'ERR_HOLD_LIMIT_REACHED',
            message: 'Member has reached the active hold limit',
          },
        },
      },
    };

    expect(extractErrorMessage(error)).toBe(
      'Bạn đã đặt giữ tối đa 3 sách cùng lúc. Hãy nhận hoặc hủy bớt sách đang giữ trước khi đặt giữ thêm.',
    );
  });
});
