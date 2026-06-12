/**
 * Remotion CLI render config (dev-only). Used by `npm run film` to export the
 * hero composition to MP4 for the rollout email / social. Not part of the
 * Next.js build.
 */
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setEntryPoint("./remotion/index.ts");
