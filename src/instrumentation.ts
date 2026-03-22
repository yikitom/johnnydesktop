export async function register() {
  // Enable proxy support for Node.js fetch (undici) when HTTP_PROXY is set.
  // This is a fallback for environments where NODE_OPTIONS=--use-env-proxy
  // cannot be configured. Node.js built-in fetch does NOT respect proxy
  // environment variables by default.
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
    try {
      const { EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici');
      setGlobalDispatcher(new EnvHttpProxyAgent());
    } catch {
      // undici not available or already configured via --use-env-proxy
    }
  }
}
