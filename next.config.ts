import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.174.41.221"],

  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "onnxruntime-common",
  ],

  outputFileTracingIncludes: {
    "/api/upload": [
      "./node_modules/@huggingface/transformers/**/*",
      "./node_modules/onnxruntime-node/**/*",
      "./node_modules/onnxruntime-common/**/*",
    ],
  },
};

export default nextConfig;