import type { MetadataRoute } from "next";

const PAGES = ["", "/launch", "/launches", "/how-it-works", "/tokenomics", "/treasury", "/faq", "/roadmap", "/about", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `https://sow.fun${path}`,
    changeFrequency: path === "/launches" || path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
