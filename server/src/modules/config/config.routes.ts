import { Router } from 'express';

import { fineConfigRouter } from '../fine/fine.routes';
import { loanPolicyRouter } from '../member/member.routes';

const configRouter = Router();

configRouter.use(loanPolicyRouter);
configRouter.use(fineConfigRouter);

export { configRouter };
