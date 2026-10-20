import { endpoint, json } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { body } from '@/lib/security';
import { castBallot } from '@/lib/election';
export const POST = endpoint(async request => {
  const user = await requireUser(request, ['student']);
  return json(await castBallot(user.id, await body(request)));
});
