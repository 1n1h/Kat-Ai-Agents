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
  ],
};

export default nextConfig;
