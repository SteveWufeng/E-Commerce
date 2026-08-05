/**
 * Central mock for next-auth (ESM-only in v5 beta).
 *
 * Jest cannot transform next-auth's ESM output, so we substitute a CJS mock
 * for every entry point the app imports (root, /providers/*, /react).
 */

const handlers = {
  GET: jest.fn(async () => new Response(null, { status: 200 })),
  POST: jest.fn(async () => new Response(null, { status: 200 })),
};

const auth = jest.fn(async () => null);
const signIn = jest.fn();
const signOut = jest.fn(async () => undefined);

const NextAuthMock = jest.fn(() => ({ handlers, auth, signIn, signOut }));

export { handlers, auth, signIn, signOut };
export default NextAuthMock;
