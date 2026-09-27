import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.174.41.221"],

  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
  ],

  outputFileTracingIncludes: {
    "/api/upload": [
      "./node_modules/onnxruntime-node/**/*",
      "./node_modules/@huggingface/transformers/**/*",
    ],
  },
};

export default nextConfig;