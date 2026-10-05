import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/my", "/api/"] }],
    sitemap: "https://sow.fun/sitemap.xml",
  };
}
