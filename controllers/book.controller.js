import BookSchema from "../DB/models/Book.js";
import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";
import { uploadToR2, deleteFromR2 } from "../utils/r2Upload.js";
import { cleanTempFiles } from "../middlewares/multerConfig.js";
import { getSharedConnection } from "../middlewares/dbConnection.js";

// Helper to get Book model from tenant connection
async function getBookModel() {
  const conn = await getSharedConnection();
  return conn.model("Book", BookSchema);
}

// Helper to dynamically rewrite legacy R2 API URLs to Public URLs in response payloads
function fixBookUrls(book) {
  if (!book) return book;
  const oldHost = `https://${process.env.CLOUDFLARE_R2_BUCKET_NAME || "egram"}.r2.cloudflarestorage.com`;
  const newHost = process.env.CLOUDFLARE_R2_PUBLIC_URL 
    ? process.env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, "")
    : oldHost;

  if (book.coverImage && book.coverImage.startsWith(oldHost) && newHost !== oldHost) {
    book.coverImage = book.coverImage.replace(oldHost, newHost);
  }
  if (book.pdfFile && book.pdfFile.startsWith(oldHost) && newHost !== oldHost) {
    book.pdfFile = book.pdfFile.replace(oldHost, newHost);
  }
  return book;
}

// ─── GET /api/admin/books/stats ────────────────
export const getBookStats = wrapAsync(async (req, res) => {
  const Book = await getBookModel();
  const totalBooks = await Book.countDocuments();
  const result = await Book.aggregate([
    { $group: { _id: null, totalDownloads: { $sum: "$downloads" } } },
  ]);
  const totalDownloads = result[0]?.totalDownloads || 0;

  res.json({ totalBooks, totalDownloads });
});

// ─── GET /api/admin/books ──────────────────────
export const getAllBooks = wrapAsync(async (req, res) => {
  const Book = await getBookModel();
  const { search, category } = req.query;

  const filter = {};
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ title: regex }, { author: regex }];
  }
  if (category) {
    filter.category = category;
  }

  const books = await Book.find(filter).sort({ createdAt: -1 });
  const fixedBooks = books.map(b => fixBookUrls(b.toObject()));
  res.json(fixedBooks);
});

// ─── GET /api/admin/books/:id ──────────────────
export const getBookById = wrapAsync(async (req, res) => {
  const Book = await getBookModel();
  const book = await Book.findById(req.params.id);
  if (!book) throw new ExpressError("Book not found", 404);
  
  res.json(fixBookUrls(book.toObject()));
});

// ─── POST /api/admin/books ─────────────────────
export const createBook = wrapAsync(async (req, res) => {
  const Book = await getBookModel();
  const { title, author, category } = req.body;

  if (!title || !author || !category) {
    cleanTempFiles(Object.values(req.files || {}).flat());
    throw new ExpressError("Title, author, and category are required", 400);
  }

  let coverImage = "";
  let coverImageId = "";
  let pdfFile = "";
  let pdfFileId = "";

  try {
    // Upload cover image to Cloudflare R2
    if (req.files?.coverImage?.[0]) {
      const result = await uploadToR2(
        req.files.coverImage[0].path,
        "elibrary/covers",
        req.files.coverImage[0].originalname
      );
      coverImage = result.url;
      coverImageId = result.public_id;
    }

    // Upload PDF to Cloudflare R2
    if (req.files?.pdfFile?.[0]) {
      const result = await uploadToR2(
        req.files.pdfFile[0].path,
        "elibrary/pdfs",
        req.files.pdfFile[0].originalname
      );
      pdfFile = result.url;
      pdfFileId = result.public_id;
    }
  } catch (err) {
    cleanTempFiles(Object.values(req.files || {}).flat());
    throw new ExpressError(`Upload to Cloudflare R2 failed: ${err.message}`, 500);
  } finally {
    // Clean up temporary files uploaded by multer diskStorage
    cleanTempFiles(Object.values(req.files || {}).flat());
  }

  const book = new Book({
    title,
    author,
    category,
    coverImage,
    coverImageId,
    pdfFile,
    pdfFileId,
  });

  await book.save();
  res.status(201).json(fixBookUrls(book.toObject()));
});

// ─── PUT /api/admin/books/:id ──────────────────
export const updateBook = wrapAsync(async (req, res) => {
  const Book = await getBookModel();
  const book = await Book.findById(req.params.id);
  if (!book) {
    cleanTempFiles(Object.values(req.files || {}).flat());
    throw new ExpressError("Book not found", 404);
  }

  const { title, author, category } = req.body;
  if (title) book.title = title;
  if (author) book.author = author;
  if (category) book.category = category;

  try {
    // Replace cover image if new one provided
    if (req.files?.coverImage?.[0]) {
      if (book.coverImageId) {
        try { await deleteFromR2(book.coverImageId); } catch (e) { console.error(e); }
      }
      const result = await uploadToR2(
        req.files.coverImage[0].path,
        "elibrary/covers",
        req.files.coverImage[0].originalname
      );
      book.coverImage = result.url;
      book.coverImageId = result.public_id;
    }

    // Replace PDF if new one provided
    if (req.files?.pdfFile?.[0]) {
      if (book.pdfFileId) {
        try { await deleteFromR2(book.pdfFileId); } catch (e) { console.error(e); }
      }
      const result = await uploadToR2(
        req.files.pdfFile[0].path,
        "elibrary/pdfs",
        req.files.pdfFile[0].originalname
      );
      book.pdfFile = result.url;
      book.pdfFileId = result.public_id;
    }
  } catch (err) {
    cleanTempFiles(Object.values(req.files || {}).flat());
    throw new ExpressError(`Upload to Cloudflare R2 failed: ${err.message}`, 500);
  } finally {
    // Clean up temporary files
    cleanTempFiles(Object.values(req.files || {}).flat());
  }

  await book.save();
  res.json(fixBookUrls(book.toObject()));
});

// ─── DELETE /api/admin/books/:id ───────────────
export const deleteBook = wrapAsync(async (req, res) => {
  const Book = await getBookModel();
  const book = await Book.findById(req.params.id);
  if (!book) throw new ExpressError("Book not found", 404);

  // Delete Cloudflare R2 assets
  if (book.coverImageId) {
    try { await deleteFromR2(book.coverImageId); } catch { /* ignore */ }
  }
  if (book.pdfFileId) {
    try { await deleteFromR2(book.pdfFileId); } catch { /* ignore */ }
  }

  await Book.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Book deleted successfully" });
});

// ─── GET /api/admin/books/download/:id ─────────
export const downloadBook = wrapAsync(async (req, res) => {
  const Book = await getBookModel();
  const book = await Book.findById(req.params.id);
  if (!book) throw new ExpressError("Book not found", 404);
  if (!book.pdfFile) throw new ExpressError("No PDF available for this book", 404);

  // Increment download counter
  book.downloads = (book.downloads || 0) + 1;
  await book.save();

  const fixed = fixBookUrls(book.toObject());
  res.json({ url: fixed.pdfFile, downloads: fixed.downloads });
});

// ─── GET /api/books/stream/:id ──────────────────
export const streamBookPdf = wrapAsync(async (req, res) => {
  const Book = await getBookModel();
  const book = await Book.findById(req.params.id);
  if (!book) throw new ExpressError("Book not found", 404);
  if (!book.pdfFile) throw new ExpressError("No PDF available for this book", 404);

  const fixed = fixBookUrls(book.toObject());
  const fileUrl = fixed.pdfFile;

  const response = await fetch(fileUrl);
  if (!response.ok) throw new ExpressError("Failed to fetch PDF from storage", 500);

  res.setHeader("Content-Type", "application/pdf");
  
  const arrayBuffer = await response.arrayBuffer();
  res.send(Buffer.from(arrayBuffer));
});
