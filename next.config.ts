import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow the LAN IP so dev resources (HMR) load when the site is
  // opened as http://192.168.1.116:3000 instead of localhost.
  allowedDevOrigins: ["192.168.1.116", "localhost"],
};

export default nextConfig;
