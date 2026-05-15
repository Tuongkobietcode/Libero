import { AuthenticationError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { MemberStatus } from '../../common/types/enums';

export function canAuthenticateWithMemberStatus(status: MemberStatus): boolean {
  return status !== MemberStatus.Expired;
}

export function resolveAuthenticationStatusError(status: MemberStatus): AuthenticationError {
  switch (status) {
    case MemberStatus.Pending:
      return new AuthenticationError(ERR.AUTH_ACCOUNT_PENDING, 401, 'Account is pending approval');
    case MemberStatus.Expired:
      return new AuthenticationError(ERR.AUTH_ACCOUNT_EXPIRED, 401, 'Account has expired');
    case MemberStatus.Suspended:
    default:
      return new AuthenticationError(ERR.AUTH_ACCOUNT_SUSPENDED, 401, 'Account is suspended');
  }
}

export function assertCanAuthenticateWithMemberStatus(status: MemberStatus): void {
  if (!canAuthenticateWithMemberStatus(status)) {
    throw resolveAuthenticationStatusError(status);
  }
}
