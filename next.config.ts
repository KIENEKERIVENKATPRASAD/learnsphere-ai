import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.174.41.221"],

  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
  ],
};

export default nextConfig;