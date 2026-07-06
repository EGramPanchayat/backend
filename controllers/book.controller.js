import BookSchema from "../DB/models/Book.js";
import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";
import { uploadToCloudinary as uploadImage, deleteFromCloudinary as deleteImage } from "../middlewares/cloudinaryUpload.js";
import { uploadToCloudinary as uploadPDF, deleteFromCloudinary as deletePDF } from "../middlewares/cloudinaryUploadPDF.js";
import { cleanTempFiles } from "../middlewares/multerConfig.js";

// Helper to get Book model from tenant connection
function getBookModel(req) {
  return req.dbConnection.model("Book", BookSchema);
}

// ─── GET /api/admin/books/stats ────────────────
export const getBookStats = wrapAsync(async (req, res) => {
  const Book = getBookModel(req);
  const totalBooks = await Book.countDocuments();
  const result = await Book.aggregate([
    { $group: { _id: null, totalDownloads: { $sum: "$downloads" } } },
  ]);
  const totalDownloads = result[0]?.totalDownloads || 0;

  res.json({ totalBooks, totalDownloads });
});

// ─── GET /api/admin/books ──────────────────────
export const getAllBooks = wrapAsync(async (req, res) => {
  const Book = getBookModel(req);
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
  res.json(books);
});

// ─── GET /api/admin/books/:id ──────────────────
export const getBookById = wrapAsync(async (req, res) => {
  const Book = getBookModel(req);
  const book = await Book.findById(req.params.id);
  if (!book) throw new ExpressError("Book not found", 404);
  res.json(book);
});

// ─── POST /api/admin/books ─────────────────────
export const createBook = wrapAsync(async (req, res) => {
  const Book = getBookModel(req);
  const { title, author, category, description } = req.body;

  if (!title || !author || !category) {
    cleanTempFiles(Object.values(req.files || {}).flat());
    throw new ExpressError("Title, author, and category are required", 400);
  }

  let coverImage = "";
  let coverImageId = "";
  let pdfFile = "";
  let pdfFileId = "";

  try {
    // Upload cover image
    if (req.files?.coverImage?.[0]) {
      const result = await uploadImage(
        req.files.coverImage[0].path,
        `${req.gpName}/elibrary/covers`,
        title
      );
      coverImage = result.url;
      coverImageId = result.public_id;
    }

    // Upload PDF
    if (req.files?.pdfFile?.[0]) {
      const result = await uploadPDF(
        req.files.pdfFile[0].path,
        `${req.gpName}/elibrary/pdfs`,
        title
      );
      pdfFile = result.url;
      pdfFileId = result.public_id;
    }
  } catch (err) {
    cleanTempFiles(Object.values(req.files || {}).flat());
    throw new ExpressError(`Upload failed: ${err.message}`, 500);
  }

  const book = new Book({
    title,
    author,
    category,
    description: description || "",
    coverImage,
    coverImageId,
    pdfFile,
    pdfFileId,
  });

  await book.save();
  res.status(201).json(book);
});

// ─── PUT /api/admin/books/:id ──────────────────
export const updateBook = wrapAsync(async (req, res) => {
  const Book = getBookModel(req);
  const book = await Book.findById(req.params.id);
  if (!book) {
    cleanTempFiles(Object.values(req.files || {}).flat());
    throw new ExpressError("Book not found", 404);
  }

  const { title, author, category, description } = req.body;
  if (title) book.title = title;
  if (author) book.author = author;
  if (category) book.category = category;
  if (description !== undefined) book.description = description;

  try {
    // Replace cover image if new one provided
    if (req.files?.coverImage?.[0]) {
      if (book.coverImageId) await deleteImage(book.coverImageId);
      const result = await uploadImage(
        req.files.coverImage[0].path,
        `${req.gpName}/elibrary/covers`,
        book.title
      );
      book.coverImage = result.url;
      book.coverImageId = result.public_id;
    }

    // Replace PDF if new one provided
    if (req.files?.pdfFile?.[0]) {
      if (book.pdfFileId) await deletePDF(book.pdfFileId);
      const result = await uploadPDF(
        req.files.pdfFile[0].path,
        `${req.gpName}/elibrary/pdfs`,
        book.title
      );
      book.pdfFile = result.url;
      book.pdfFileId = result.public_id;
    }
  } catch (err) {
    cleanTempFiles(Object.values(req.files || {}).flat());
    throw new ExpressError(`Upload failed: ${err.message}`, 500);
  }

  await book.save();
  res.json(book);
});

// ─── DELETE /api/admin/books/:id ───────────────
export const deleteBook = wrapAsync(async (req, res) => {
  const Book = getBookModel(req);
  const book = await Book.findById(req.params.id);
  if (!book) throw new ExpressError("Book not found", 404);

  // Delete Cloudinary assets
  if (book.coverImageId) {
    try { await deleteImage(book.coverImageId); } catch { /* ignore */ }
  }
  if (book.pdfFileId) {
    try { await deletePDF(book.pdfFileId); } catch { /* ignore */ }
  }

  await Book.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Book deleted successfully" });
});

// ─── GET /api/admin/books/download/:id ─────────
export const downloadBook = wrapAsync(async (req, res) => {
  const Book = getBookModel(req);
  const book = await Book.findById(req.params.id);
  if (!book) throw new ExpressError("Book not found", 404);
  if (!book.pdfFile) throw new ExpressError("No PDF available for this book", 404);

  // Increment download counter
  book.downloads = (book.downloads || 0) + 1;
  await book.save();

  res.json({ url: book.pdfFile, downloads: book.downloads });
});
