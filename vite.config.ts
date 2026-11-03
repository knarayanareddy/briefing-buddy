import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Security Headers & CORS configuration
const securityHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // CORS configuration for development preview (restrict to specific origins or allow preview host)
    cors: {
      origin: mode === "development" ? ["https://*.e2b.app", "http://localhost:*", "http://127.0.0.1:*"] : false,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      headers: ["Content-Type", "Authorization", "apikey", "x-internal-api-key", "x-preview-user-id", "x-client-info"],
    },
    // Inject security headers into development server responses (via middleware or plugin)
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        Object.entries(securityHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        // Allow preview origin for development
        if (mode === "development") {
          const origin = req.headers.origin;
          if (origin && (origin.includes("e2b.app") || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
            res.setHeader("Access-Control-Allow-Origin", origin);
          }
        }
        next();
      });
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
