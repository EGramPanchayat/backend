import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";
import NewsSchema from "../DB/models/news.js"; // Keep schema, not the model

/** POST /news – Add a news item */
export const createNews = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const News = conn.model("News", NewsSchema);

  const { text } = req.body;
  if (!text || !text.trim()) {
    throw new ExpressError("News text is required", 400);
  }

  const news = await News.create({ text: text.trim() });
  res.status(201).json(news);
});

/** GET /news – Fetch all news items */
export const getNews = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const News = conn.model("News", NewsSchema);

  const allNews = await News.find().sort({ createdAt: -1 });
  res.json(allNews);
});

/** DELETE /news/:id – Delete a news item */
export const deleteNews = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const News = conn.model("News", NewsSchema);

  const { id } = req.params;
  const deleted = await News.findByIdAndDelete(id);
  if (!deleted) throw new ExpressError("News item not found", 404);
  res.json({ success: true });
});
