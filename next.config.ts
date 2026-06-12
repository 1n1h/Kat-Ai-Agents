import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  // the chat route reads the agent system prompts off disk at runtime
  outputFileTracingIncludes: {
    "/api/chat": ["agents/**/*.md"],
  },
};

export default nextConfig;
