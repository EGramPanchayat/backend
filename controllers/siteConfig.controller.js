import wrapAsync from "../utils/wrapAsync.js";
import SiteConfigSchema from "../DB/models/siteConfig.js";

// GET — Public: return the full site config
export const getSiteConfig = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const SiteConfig = conn.model("SiteConfig", SiteConfigSchema);

  const config = await SiteConfig.findOne();
  if (!config) return res.status(404).json({ message: "Site config not found" });

  res.json(config);
});

// POST — Admin: update site configuration (stats, contact, village details)
export const updateSiteConfig = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const SiteConfig = conn.model("SiteConfig", SiteConfigSchema);

  const body = req.body;
  let config = await SiteConfig.findOne();
  if (!config) {
    config = new SiteConfig();
  }

  // Basic identity fields are static constants and cannot be edited via Admin

  // Update stats
  if (body.stats && Array.isArray(body.stats)) {
    config.stats = body.stats;
  }

  // Update contact
  if (body.contact) {
    config.contact = {
      ...config.contact,
      ...body.contact
    };
  }

  await config.save();
  res.json(config);
});
