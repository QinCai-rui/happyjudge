import { error } from '@sveltejs/kit';

type AuthenticatedAuth = {
  user: NonNullable<App.Locals['auth']['user']>;
  session: NonNullable<App.Locals['auth']['session']>;
};

export function assertUserExists(authLocal: App.Locals['auth']): asserts authLocal is AuthenticatedAuth {
  // Unauthenticated requests arrive as { user: null, session: null }
  // (see hooks.server.ts), never as null/undefined, so check the payload.
  if (!authLocal?.user || !authLocal?.session) throw error(401, 'Unauthorized');
}
