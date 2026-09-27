import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.174.41.221"],

  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
  ],

  outputFileTracingIncludes: {
    "/api/*": [
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/**/*",
    ],
  },
};

export default nextConfig;