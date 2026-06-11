import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Agent SDK spawns the Claude Code runtime as a subprocess; keep it
  // external so Next never tries to bundle it into the server build.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
};

export default nextConfig;
