import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve Firebase's auth handler from our own domain so Google's sign-in
  // popup says "continue to kat-ai-agents.vercel.app" instead of the raw
  // firebaseapp.com domain (requires NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN to be
  // set to this app's domain).
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination:
          "https://ai-paralegal-b0b9d.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/:path*",
        destination:
          "https://ai-paralegal-b0b9d.firebaseapp.com/__/firebase/:path*",
      },
    ];
  },

  // The Agent SDK spawns the Claude Code runtime as a subprocess, and the
  // Kokoro TTS stack loads native ONNX binaries; keep them external so Next
  // never tries to bundle them into the server build.
  serverExternalPackages: [
    "@anthropic-ai/claude-agent-sdk",
    "kokoro-js",
    "@huggingface/transformers",
    "onnxruntime-node",
    "pdfkit",
    "exceljs",
  ],

  // The agent runtime and the local TTS stack are local-install features;
  // they blow past Vercel's 250MB function limit, so keep them out of the
  // deployed bundles. Their routes return a clear "local only" error in the
  // cloud (see the dynamic imports in those routes).
  outputFileTracingExcludes: {
    "*": [
      "node_modules/onnxruntime-node/**",
      "node_modules/@huggingface/transformers/**",
      "node_modules/kokoro-js/**",
      "node_modules/@anthropic-ai/claude-agent-sdk/**",
    ],
  },
  // the chat route reads agent system prompts and firm profiles off disk
  outputFileTracingIncludes: {
    "/api/chat": ["agents/**/*.md", "firm/**/*.md"],
  },
};

export default nextConfig;
