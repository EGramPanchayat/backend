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
