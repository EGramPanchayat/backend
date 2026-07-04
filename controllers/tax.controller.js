import crypto from "crypto";
import Razorpay from "razorpay";
import ExpressError from "../utils/ExpressError.js";
import wrapAsync from "../utils/wrapAsync.js";
import TaxBillSchema from "../DB/models/taxBill.js";
import PaymentHistorySchema from "../DB/models/paymentHistory.js";
import FamilySchema from "../DB/models/family.js";

// Initialize Razorpay SDK
const rzpKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_dummyKeyId123";
const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || "dummySecret123";
const razorpay = new Razorpay({
  key_id: rzpKeyId,
  key_secret: rzpKeySecret,
});

const isDummyKey = rzpKeyId.includes("dummyKeyId");

// GET /api/taxes/:familyId
export const getFamilyTaxes = wrapAsync(async (req, res) => {
  const { familyId } = req.params;
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const PaymentHistory = conn.model("PaymentHistory", PaymentHistorySchema);

  const bills = await TaxBill.find({ familyId }).sort({ year: -1 });
  const payments = await PaymentHistory.find({ familyId }).sort({ paymentDate: -1 });

  res.json({ bills, payments });
});

// POST /api/admin/taxes/assign
export const assignTax = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const Family = conn.model("Family", FamilySchema);

  const { familyId, taxType, year, amount, dueDate } = req.body;
  if (!familyId || !taxType || !year || !amount) {
    throw new ExpressError("Required parameters (familyId, taxType, year, amount) missing", 400);
  }

  // Verify family exists
  const family = await Family.findOne({ familyId });
  if (!family) {
    throw new ExpressError("Household not found", 404);
  }

  // Create or Update bill
  let bill = await TaxBill.findOne({ familyId, taxType, year });
  if (bill) {
    bill.amount = Number(amount);
    // Recalculate status
    if (bill.paidAmount >= bill.amount) {
      bill.status = "paid";
    } else if (bill.paidAmount > 0) {
      bill.status = "partial";
    } else {
      bill.status = "pending";
    }
    if (dueDate) bill.dueDate = new Date(dueDate);
  } else {
    bill = new TaxBill({
      familyId,
      taxType,
      year: Number(year),
      amount: Number(amount),
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });
  }

  await bill.save();
  res.json({ success: true, bill });
});

// POST /api/admin/payments/offline
export const recordOfflinePayment = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const PaymentHistory = conn.model("PaymentHistory", PaymentHistorySchema);

  const { billId, amountPaid } = req.body;
  if (!billId || !amountPaid) {
    throw new ExpressError("Bill ID and payment amount are required", 400);
  }

  const bill = await TaxBill.findById(billId);
  if (!bill) throw new ExpressError("Tax bill not found", 404);

  const parsedAmount = Number(amountPaid);
  if (parsedAmount <= 0) {
    throw new ExpressError("Payment amount must be greater than 0", 400);
  }

  // Update bill status and paid amount
  bill.paidAmount += parsedAmount;
  if (bill.paidAmount >= bill.amount) {
    bill.status = "paid";
  } else {
    bill.status = "partial";
  }
  await bill.save();

  // Create payment receipt
  const receiptNo = `OFFLINE_${Date.now()}`;
  const payment = new PaymentHistory({
    familyId: bill.familyId,
    billId: bill._id,
    taxType: bill.taxType,
    amountPaid: parsedAmount,
    transactionId: receiptNo,
    paymentMethod: "offline",
    status: "success",
  });
  await payment.save();

  res.json({ success: true, bill, payment });
});

// POST /api/payments/order
export const createRazorpayOrder = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);

  const { billId, amount } = req.body;
  if (!billId || !amount) {
    throw new ExpressError("Bill ID and pay amount are required", 400);
  }

  const bill = await TaxBill.findById(billId);
  if (!bill) throw new ExpressError("Tax bill not found", 404);

  const parsedAmount = Number(amount);
  if (parsedAmount <= 0 || parsedAmount > (bill.amount - bill.paidAmount)) {
    throw new ExpressError("Invalid payment amount", 400);
  }

  // If we are in sandbox/dummy mode, we simulate order ID
  if (isDummyKey) {
    const mockOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
    return res.json({
      success: true,
      orderId: mockOrderId,
      amount: parsedAmount,
      currency: "INR",
      keyId: rzpKeyId,
      mock: true,
    });
  }

  // Create real Razorpay Order
  const options = {
    amount: Math.round(parsedAmount * 100), // in paise
    currency: "INR",
    receipt: `rcpt_${bill._id.toString().substring(0, 10)}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      amount: parsedAmount,
      currency: "INR",
      keyId: rzpKeyId,
      mock: false,
    });
  } catch (err) {
    throw new ExpressError(`Razorpay Order creation failed: ${err.message}`, 500);
  }
});

// POST /api/payments/verify
export const verifyRazorpayPayment = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const PaymentHistory = conn.model("PaymentHistory", PaymentHistorySchema);

  const {
    billId,
    amount,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    mock,
  } = req.body;

  if (!billId || !amount || !razorpayOrderId || !razorpayPaymentId) {
    throw new ExpressError("Required transaction details missing", 400);
  }

  const bill = await TaxBill.findById(billId);
  if (!bill) throw new ExpressError("Tax bill not found", 404);

  const parsedAmount = Number(amount);

  // Validate transaction authenticity
  if (mock || isDummyKey) {
    console.log(`✅ Sandbox checkout success: Order ${razorpayOrderId}`);
  } else {
    // Real signature check
    const text = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", rzpKeySecret)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      throw new ExpressError("Payment verification failed: invalid signature", 400);
    }
  }

  // Check if this transaction has already been applied (avoid duplicate webhook hits)
  const existingTx = await PaymentHistory.findOne({ transactionId: razorpayPaymentId });
  if (existingTx) {
    return res.json({ success: true, message: "Transaction already processed", bill });
  }

  // Update bill status and amount
  bill.paidAmount += parsedAmount;
  if (bill.paidAmount >= bill.amount) {
    bill.status = "paid";
  } else {
    bill.status = "partial";
  }
  await bill.save();

  // Create Payment Entry
  const payment = new PaymentHistory({
    familyId: bill.familyId,
    billId: bill._id,
    taxType: bill.taxType,
    amountPaid: parsedAmount,
    transactionId: razorpayPaymentId,
    paymentMethod: "razorpay",
    status: "success",
  });
  await payment.save();

  res.json({ success: true, bill, payment });
});

// Admin: Get all transaction history
export const getPaymentsLogs = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const PaymentHistory = conn.model("PaymentHistory", PaymentHistorySchema);

  const list = await PaymentHistory.find().sort({ paymentDate: -1 });
  res.json(list);
});
