/**
 * Custom Jest environment (jsdom + Node web globals).
 *
 * jest-environment-jsdom replaces the global object with jsdom's window,
 * which drops Node's native Request/Response/Headers that Next.js server
 * code (next/server) depends on. This environment restores them from the
 * outer Node realm.
 */
const JSDOMEnvironment = require("jest-environment-jsdom").default || require("jest-environment-jsdom");

class JsdomWithWebGlobals extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context);
    const nodeRealm = globalThis;
    const globals = this.global;
    if (typeof nodeRealm.Request === "function") globals.Request = nodeRealm.Request;
    if (typeof nodeRealm.Response === "function") globals.Response = nodeRealm.Response;
    if (typeof nodeRealm.Headers === "function") globals.Headers = nodeRealm.Headers;
    if (typeof nodeRealm.fetch === "function") globals.fetch = nodeRealm.fetch;
    if (typeof nodeRealm.ReadableStream === "function") globals.ReadableStream = nodeRealm.ReadableStream;
  }
}

module.exports = JsdomWithWebGlobals;
