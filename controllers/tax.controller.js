import crypto from "crypto";
import Razorpay from "razorpay";
import ExpressError from "../utils/ExpressError.js";
import wrapAsync from "../utils/wrapAsync.js";
import TaxBillSchema from "../DB/models/taxBill.js";
import PaymentHistorySchema from "../DB/models/paymentHistory.js";
import FamilySchema from "../DB/models/family.js";
import TaxScheduleSchema from "../DB/models/taxSchedule.js";
import { createNotification, createBulkNotifications, taxTypeLabelsMarathi } from "./notification.controller.js";

// Initialize Razorpay SDK
const rzpKeyId = process.env.RAZORPAY_KEY_ID || "rzp_test_dummyKeyId123";
const rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || "dummySecret123";
const razorpay = new Razorpay({
  key_id: rzpKeyId,
  key_secret: rzpKeySecret,
});

const isDummyKey = rzpKeyId.includes("dummyKeyId");

const TAX_CATEGORY_TYPES = {
  water: ["samanya_water", "vishesh_water"],
  house: ["house", "health", "electricity"],
  fine: ["fine"],
};

const getOutstandingAmount = (bill) =>
  Math.max((Number(bill.amount) || 0) - (Number(bill.paidAmount) || 0), 0);

const toPaise = (amount) => Math.round(Number(amount || 0) * 100);

const verifyCheckoutSignature = (orderId, paymentId, signature) => {
  if (!signature) {
    throw new ExpressError("Payment verification failed: missing signature", 400);
  }

  const expectedSignature = crypto
    .createHmac("sha256", rzpKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new ExpressError("Payment verification failed: invalid signature", 400);
  }
};

const verifyRazorpayTransactionDetails = async ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  verifyCheckoutSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

  let [order, payment] = await Promise.all([
    razorpay.orders.fetch(razorpayOrderId),
    razorpay.payments.fetch(razorpayPaymentId),
  ]);

  if (!order || !payment) {
    throw new ExpressError("Payment verification failed: transaction not found", 400);
  }
  if (payment.order_id !== razorpayOrderId) {
    throw new ExpressError("Payment verification failed: order mismatch", 400);
  }
  if (order.currency !== "INR" || payment.currency !== "INR") {
    throw new ExpressError("Payment verification failed: invalid currency", 400);
  }
  if (Number(payment.amount) !== Number(order.amount)) {
    throw new ExpressError("Payment verification failed: amount mismatch", 400);
  }

  if (payment.status === "authorized") {
    payment = await razorpay.payments.capture(razorpayPaymentId, Number(order.amount), "INR");
  }
  if (payment.status !== "captured") {
    throw new ExpressError(`Payment verification failed: payment is ${payment.status}`, 400);
  }

  return {
    order,
    payment,
    amount: Number(order.amount) / 100,
    notes: order.notes || {},
  };
};

// GET /api/taxes/:familyId
export const getFamilyTaxes = wrapAsync(async (req, res) => {
  const { familyId } = req.params;
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const PaymentHistory = conn.model("PaymentHistory", PaymentHistorySchema);

  let bills = await TaxBill.find({ familyId }).sort({ year: -1 });
  const payments = await PaymentHistory.find({ familyId }).sort({ paymentDate: -1 });

  // Fallback: Auto-copy previous year's tax bills if current financial year lacks bills
  const now = new Date();
  const currentFinancialYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const hasCurrentYearBills = bills.some((b) => b.year === currentFinancialYear);

  if (!hasCurrentYearBills && bills.length > 0) {
    const prevYearBills = bills.filter((b) => b.year === currentFinancialYear - 1);
    if (prevYearBills.length > 0) {
      const calculatedDueDate = new Date(`${currentFinancialYear + 1}-03-31T23:59:59.999Z`);
      const newBills = [];

      for (const oldBill of prevYearBills) {
        // Prevent race condition duplicates
        const exists = await TaxBill.findOne({ familyId, taxType: oldBill.taxType, year: currentFinancialYear });
        if (!exists) {
          const newBill = new TaxBill({
            familyId: oldBill.familyId,
            taxType: oldBill.taxType,
            year: currentFinancialYear,
            amount: oldBill.amount,
            reason: oldBill.reason || "",
            dueDate: calculatedDueDate,
            paidAmount: 0,
            status: "pending",
          });
          await newBill.save();
          newBills.push(newBill);
        }
      }

      if (newBills.length > 0) {
        // Reload list from database
        bills = await TaxBill.find({ familyId }).sort({ year: -1 });
      }
    }
  }

  res.json({ bills, payments });
});

// POST /api/admin/taxes/assign
export const assignTax = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const Family = conn.model("Family", FamilySchema);

  const { familyId, taxType, year, amount, reason } = req.body;
  if (!familyId || !taxType || !year || !amount) {
    throw new ExpressError("Required parameters (familyId, taxType, year, amount) missing", 400);
  }

  // Verify family exists
  const family = await Family.findOne({ familyId });
  if (!family) {
    throw new ExpressError("Household not found", 404);
  }

  const calculatedDueDate = new Date(`${Number(year) + 1}-03-31T23:59:59.999Z`);

  // Create or Update bill
  let bill = await TaxBill.findOne({ familyId, taxType, year });
  if (bill) {
    bill.amount = Number(amount);
    if (reason !== undefined) bill.reason = reason;
    // Recalculate status
    if (bill.paidAmount >= bill.amount) {
      bill.status = "paid";
    } else if (bill.paidAmount > 0) {
      bill.status = "partial";
    } else {
      bill.status = "pending";
    }
    bill.dueDate = calculatedDueDate;
  } else {
    bill = new TaxBill({
      familyId,
      taxType,
      year: Number(year),
      amount: Number(amount),
      reason: reason || "",
      dueDate: calculatedDueDate,
    });
  }

  await bill.save();

  // Create notification for the family
  const taxLabel = taxTypeLabelsMarathi[taxType] || taxType;
  const isUpdate = bill.createdAt.getTime() !== bill.updatedAt.getTime();
  const notifType = taxType === "fine" ? "fine_assigned" : isUpdate ? "tax_updated" : "tax_assigned";
  const fyLabel = `${year}-${Number(year) + 1}`;

  await createNotification(conn, {
    familyId,
    type: notifType,
    title: notifType === "fine_assigned"
      ? `दंड आकारणी - वर्ष ${fyLabel}`
      : notifType === "tax_updated"
        ? `कर अद्ययावत - ${taxLabel}`
        : `नवीन कर आकारणी - ${taxLabel}`,
    message: notifType === "fine_assigned"
      ? `वर्ष ${fyLabel} साठी ₹${amount} दंड आकारण्यात आला आहे.${reason ? ` कारण: ${reason}` : ""}`
      : notifType === "tax_updated"
        ? `वर्ष ${fyLabel} साठी ${taxLabel} ची रक्कम ₹${amount} अद्ययावत केली आहे.`
        : `वर्ष ${fyLabel} साठी ${taxLabel} ₹${amount} आकारण्यात आला आहे.`,
    metadata: { taxType, year: Number(year), amount: Number(amount), billId: bill._id },
  });

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

  // Create notification for offline payment
  const taxLabel = taxTypeLabelsMarathi[bill.taxType] || bill.taxType;
  const fyLabel = `${bill.year}-${bill.year + 1}`;
  await createNotification(conn, {
    familyId: bill.familyId,
    type: "payment_received",
    title: `भरणा जमा - ${taxLabel}`,
    message: `वर्ष ${fyLabel} साठी ${taxLabel} ची ₹${parsedAmount} ऑफलाइन भरणा यशस्वीरित्या नोंदवली गेली. (Receipt: ${receiptNo})`,
    metadata: { taxType: bill.taxType, year: bill.year, amountPaid: parsedAmount, paymentMethod: "offline", transactionId: receiptNo, billId: bill._id },
  });

  res.json({ success: true, bill, payment });
});

// POST /api/payments/order
// POST /api/payments/order
export const createRazorpayOrder = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);

  const { billId, amount, category, familyId } = req.body;
  if (!amount) {
    throw new ExpressError("Payment amount is required", 400);
  }

  const rawAmount = Number(amount);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new ExpressError("Invalid payment amount", 400);
  }
  const parsedAmount = Math.round((rawAmount + Number.EPSILON) * 100) / 100;

  // Handle Certificate Application Fee Orders dynamically
  if (billId === "CERTIFICATE_FEE") {
    const finalFeeAmount = 20; // Enforce exactly Rs 20 compulsory fee
    if (isDummyKey) {
      const mockOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
      return res.json({
        success: true,
        orderId: mockOrderId,
        amount: finalFeeAmount,
        currency: "INR",
        keyId: rzpKeyId,
        mock: true,
      });
    }

    const options = {
      amount: finalFeeAmount * 100,
      currency: "INR",
      receipt: `rcpt_cert_${Date.now().toString().substring(5)}`,
      notes: {
        purpose: "certificate_fee",
        billId: "CERTIFICATE_FEE",
      },
    };

    try {
      const order = await razorpay.orders.create(options);
      return res.json({
        success: true,
        orderId: order.id,
        amount: finalFeeAmount,
        currency: "INR",
        keyId: rzpKeyId,
        mock: false,
      });
    } catch (err) {
      throw new ExpressError(`Razorpay Order creation failed: ${err.message}`, 550);
    }
  }

  // Handle Aggregated Category Payment
  if (category && familyId) {
    const targetTypes = TAX_CATEGORY_TYPES[category];
    if (!targetTypes) {
      throw new ExpressError("Invalid payment category. Must be water, house, or fine", 400);
    }

    const pendingBills = await TaxBill.find({
      familyId,
      taxType: { $in: targetTypes },
      status: { $in: ["pending", "partial"] },
    });
    const totalOutstanding = pendingBills.reduce(
      (sum, bill) => sum + getOutstandingAmount(bill),
      0,
    );

    if (totalOutstanding <= 0) {
      throw new ExpressError("No outstanding bills found for this category", 400);
    }
    const minPayable = Math.min(500, totalOutstanding);
    if (parsedAmount < minPayable) {
      throw new ExpressError(`Payment must be at least ₹${minPayable}`, 400);
    }
    if (parsedAmount > totalOutstanding) {
      throw new ExpressError(`Payment cannot exceed the outstanding amount of ₹${totalOutstanding}`, 400);
    }

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

    const options = {
      amount: Math.round(parsedAmount * 100),
      currency: "INR",
      receipt: `rcpt_agg_${category.substring(0, 5)}_${familyId.substring(0, 8)}_${Date.now().toString().substring(7)}`,
      notes: {
        purpose: "tax_category",
        category,
        familyId,
      },
    };

    try {
      const order = await razorpay.orders.create(options);
      return res.json({
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
  }

  const bill = await TaxBill.findById(billId);
  if (!bill) throw new ExpressError("Tax bill not found", 404);

  if (parsedAmount > (bill.amount - bill.paidAmount)) {
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
    notes: {
      purpose: "tax_bill",
      billId: bill._id.toString(),
      familyId: bill.familyId,
      taxType: bill.taxType,
    },
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
    category,
    familyId,
  } = req.body;

  if (!amount || !razorpayOrderId || !razorpayPaymentId) {
    throw new ExpressError("Required transaction details missing", 400);
  }

  const rawAmount = Number(amount);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new ExpressError("Invalid payment amount", 400);
  }
  let parsedAmount = Math.round((rawAmount + Number.EPSILON) * 100) / 100;
  let verifiedBillId = billId;
  let verifiedCategory = category;
  let verifiedFamilyId = familyId;

  // Validate transaction authenticity
  if (isDummyKey) {
    console.log(`✅ Sandbox checkout success: Order ${razorpayOrderId}`);
  } else {
    const verified = await verifyRazorpayTransactionDetails({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (toPaise(parsedAmount) !== toPaise(verified.amount)) {
      throw new ExpressError("Payment verification failed: paid amount does not match order amount", 400);
    }

    parsedAmount = Math.round((verified.amount + Number.EPSILON) * 100) / 100;
    verifiedBillId = verified.notes.billId || billId;
    verifiedCategory = verified.notes.category || category;
    verifiedFamilyId = verified.notes.familyId || familyId;
  }

  // Check if this transaction has already been applied (avoid duplicate webhook hits)
  const existingTx = await PaymentHistory.findOne({ transactionId: razorpayPaymentId });
  if (existingTx) {
    return res.json({ success: true, message: "Transaction already processed" });
  }

  // Handle Certificate Application Fee Payments dynamically
  if (verifiedBillId === "CERTIFICATE_FEE") {
    return res.json({ success: true, message: "Certificate fee verified", transactionId: razorpayPaymentId });
  }

  // Handle Aggregated Category Payment
  if (verifiedCategory && verifiedFamilyId) {
    const targetTypes = TAX_CATEGORY_TYPES[verifiedCategory];
    if (!targetTypes) {
      throw new ExpressError("Invalid payment category. Must be water, house, or fine", 400);
    }

    const query = {
      familyId: verifiedFamilyId,
      taxType: { $in: targetTypes },
      status: { $in: ["pending", "partial"] },
    };

    // No year filter is accepted here: every category payment must clear
    // previous financial years before it can reach a newer bill.
    const billsToPay = await TaxBill.find(query).sort({
      year: 1,
      dueDate: 1,
      createdAt: 1,
      _id: 1,
    });
    const totalOutstanding = billsToPay.reduce(
      (sum, bill) => sum + getOutstandingAmount(bill),
      0,
    );
    if (totalOutstanding <= 0) {
      throw new ExpressError("No outstanding bills found for this category", 400);
    }
    if (parsedAmount > totalOutstanding) {
      throw new ExpressError(`Payment cannot exceed the outstanding amount of ₹${totalOutstanding}`, 400);
    }

    let remaining = parsedAmount;
    const allocations = [];
    for (const b of billsToPay) {
      if (remaining <= 0) break;
      const outstanding = getOutstandingAmount(b);
      if (outstanding <= 0) continue;
      const allocatedAmount = Math.min(outstanding, remaining);
      b.paidAmount = (Number(b.paidAmount) || 0) + allocatedAmount;
      b.status = b.paidAmount >= b.amount ? "paid" : "partial";
      remaining -= allocatedAmount;
      await b.save();
      allocations.push({
        billId: b._id,
        year: b.year,
        taxType: b.taxType,
        amount: allocatedAmount,
      });
    }

    // Create Payment Entry
    const payment = new PaymentHistory({
      familyId: verifiedFamilyId,
      taxType: verifiedCategory,
      amountPaid: parsedAmount,
      transactionId: razorpayPaymentId,
      paymentMethod: "razorpay",
      status: "success",
      allocations,
    });
    await payment.save();

    // Create notification for aggregated online payment
    const catLabel = taxTypeLabelsMarathi[verifiedCategory] || verifiedCategory;
    await createNotification(conn, {
      familyId: verifiedFamilyId,
      type: "payment_received",
      title: `ऑनलाइन भरणा जमा - ${catLabel}`,
      message: `${catLabel} श्रेणीसाठी ₹${parsedAmount} ऑनलाइन भरणा यशस्वीरित्या जमा झाली.`,
      metadata: { taxType: verifiedCategory, amountPaid: parsedAmount, paymentMethod: "razorpay", transactionId: razorpayPaymentId },
    });

    return res.json({ success: true, message: "Aggregated payment processed successfully", payment });
  }

  // Fallback for single billId payments
  const bill = await TaxBill.findById(verifiedBillId);
  if (!bill) throw new ExpressError("Tax bill not found", 404);
  const billOutstanding = getOutstandingAmount(bill);
  if (billOutstanding <= 0) {
    throw new ExpressError("No outstanding amount found for this bill", 400);
  }
  if (parsedAmount > billOutstanding) {
    throw new ExpressError(`Payment cannot exceed the outstanding amount of â‚¹${billOutstanding}`, 400);
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

  // Create notification for online payment
  const taxLabelOnline = taxTypeLabelsMarathi[bill.taxType] || bill.taxType;
  const fyLabelOnline = `${bill.year}-${bill.year + 1}`;
  await createNotification(conn, {
    familyId: bill.familyId,
    type: "payment_received",
    title: `ऑनलाइन भरणा जमा - ${taxLabelOnline}`,
    message: `वर्ष ${fyLabelOnline} साठी ${taxLabelOnline} ची ₹${parsedAmount} ऑनलाइन भरणा यशस्वीरित्या जमा झाली.`,
    metadata: { taxType: bill.taxType, year: bill.year, amountPaid: parsedAmount, paymentMethod: "razorpay", transactionId: razorpayPaymentId, billId: bill._id },
  });

  res.json({ success: true, bill, payment });
});

// Admin: Get all transaction history
export const getPaymentsLogs = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const PaymentHistory = conn.model("PaymentHistory", PaymentHistorySchema);

  const list = await PaymentHistory.find().sort({ paymentDate: -1 });
  res.json(list);
});

// GET /api/admin/taxes/stats
export const getGlobalTaxStats = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;

  // Run auto release check first
  await checkAndAutoReleaseTaxes(conn);

  const TaxBill = conn.model("TaxBill", TaxBillSchema);

  // Fetch all bills
  const bills = await TaxBill.find();

  const currentYear = new Date().getFullYear();

  // 1. Calculate Chalu Vasuli (current year total paidAmount)
  let chaluVasuliWater = 0;
  let chaluVasuliHouse = 0;
  let chaluVasuliFine = 0;

  // 2. Group older / all years and get thakbaki
  const yearlyStatsMap = {};

  bills.forEach((bill) => {
    const isWater = ["samanya_water", "vishesh_water"].includes(bill.taxType);
    const isHouse = ["house", "health", "electricity"].includes(bill.taxType);
    const isFine = bill.taxType === "fine";

    // Update Chalu Vasuli (Only current year)
    if (bill.year === currentYear) {
      if (isWater) chaluVasuliWater += (bill.paidAmount || 0);
      if (isHouse) chaluVasuliHouse += (bill.paidAmount || 0);
      if (isFine) chaluVasuliFine += (bill.paidAmount || 0);
    }

    // Initialize yearly mapping if not exists
    if (!yearlyStatsMap[bill.year]) {
      yearlyStatsMap[bill.year] = {
        year: bill.year,
        waterAmount: 0,
        waterPaid: 0,
        houseAmount: 0,
        housePaid: 0,
        fineAmount: 0,
        finePaid: 0,
      };
    }

    const yr = yearlyStatsMap[bill.year];
    if (isWater) {
      yr.waterAmount += (bill.amount || 0);
      yr.waterPaid += (bill.paidAmount || 0);
    } else if (isHouse) {
      yr.houseAmount += (bill.amount || 0);
      yr.housePaid += (bill.paidAmount || 0);
    } else if (isFine) {
      yr.fineAmount += (bill.amount || 0);
      yr.finePaid += (bill.paidAmount || 0);
    }
  });

  const yearlyBreakdown = Object.values(yearlyStatsMap).sort((a, b) => b.year - a.year);

  res.json({
    currentYear,
    chaluVasuli: {
      water: chaluVasuliWater,
      house: chaluVasuliHouse,
      fine: chaluVasuliFine,
      total: chaluVasuliWater + chaluVasuliHouse + chaluVasuliFine
    },
    yearlyBreakdown
  });
});

// POST /api/admin/taxes/bulk-release
export const bulkReleaseTaxes = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);

  const { year } = req.body;

  if (!year) {
    throw new ExpressError("Year is required for tax release", 400);
  }

  const targetYear = Number(year);
  const calculatedDueDate = new Date(`${targetYear + 1}-03-31T23:59:59.999Z`);

  // Single aggregation query to fetch the latest amount for each familyId and taxType combination
  const latestTaxes = await TaxBill.aggregate([
    { $sort: { year: -1 } },
    {
      $group: {
        _id: { familyId: "$familyId", taxType: "$taxType" },
        amount: { $first: "$amount" }
      }
    }
  ]);

  if (latestTaxes.length === 0) {
    return res.json({ success: true, message: "No previous tax configurations found in the system to release." });
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const entry of latestTaxes) {
    const { familyId, taxType } = entry._id;
    const amount = entry.amount;

    // Skip fine bills, we do not bulk release penalty fines
    if (taxType === "fine") continue;

    let bill = await TaxBill.findOne({
      familyId,
      taxType,
      year: targetYear
    });

    if (bill) {
      bill.amount = amount;
      bill.dueDate = calculatedDueDate;
      // Recalculate status
      if (bill.paidAmount >= bill.amount) {
        bill.status = "paid";
      } else if (bill.paidAmount > 0) {
        bill.status = "partial";
      } else {
        bill.status = "pending";
      }
      await bill.save();
      updatedCount++;
    } else {
      bill = new TaxBill({
        familyId,
        taxType,
        year: targetYear,
        amount: amount,
        dueDate: calculatedDueDate,
        paidAmount: 0,
        status: "pending"
      });
      await bill.save();
      createdCount++;
    }
  }

  // Create bulk notifications for all families affected
  const allFamilyIds = [...new Set(latestTaxes.map(e => e._id.familyId).filter(id => latestTaxes.find(t => t._id.familyId === id && t._id.taxType !== "fine")))];
  const fyLabel = `${targetYear}-${targetYear + 1}`;
  const bulkNotifs = allFamilyIds.map(fId => ({
    familyId: fId,
    type: "bulk_release",
    title: `वार्षिक कर आकारणी - वर्ष ${fyLabel}`,
    message: `वर्ष ${fyLabel} साठी सर्व कर (पाणीपट्टी, घरपट्टी इ.) मागील दरानुसार आकारण्यात आले आहेत.`,
    metadata: { year: targetYear },
    isRead: false,
  }));
  if (bulkNotifs.length > 0) {
    await createBulkNotifications(conn, bulkNotifs);
  }

  res.json({
    success: true,
    message: `Taxes successfully released for Year ${targetYear} using custom household rates. Created ${createdCount} bills, Updated ${updatedCount} bills.`
  });
});

// GET /api/admin/taxes/schedule
export const getTaxSchedule = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxSchedule = conn.model("TaxSchedule", TaxScheduleSchema);

  let schedule = await TaxSchedule.findOne();
  if (!schedule) {
    schedule = new TaxSchedule({
      isPaused: false,
      nextReleaseYear: 2025,
      history: [
        { year: 2024, releasedAt: new Date("2024-04-01T09:00:00Z") },
        { year: 2023, releasedAt: new Date("2023-04-01T09:00:00Z") }
      ]
    });
    await schedule.save();
  }

  res.json(schedule);
});

// POST /api/admin/taxes/schedule/toggle
export const toggleTaxSchedule = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxSchedule = conn.model("TaxSchedule", TaxScheduleSchema);

  let schedule = await TaxSchedule.findOne();
  if (!schedule) {
    schedule = new TaxSchedule({
      isPaused: false,
      nextReleaseYear: 2025,
      history: [
        { year: 2024, releasedAt: new Date("2024-04-01T09:00:00Z") },
        { year: 2023, releasedAt: new Date("2023-04-01T09:00:00Z") }
      ]
    });
  }

  schedule.isPaused = !schedule.isPaused;
  await schedule.save();
  res.json(schedule);
});

// Helper Function: Check and run auto release
export const checkAndAutoReleaseTaxes = async (conn) => {
  try {
    const TaxSchedule = conn.model("TaxSchedule", TaxScheduleSchema);
    const TaxBill = conn.model("TaxBill", TaxBillSchema);

    let schedule = await TaxSchedule.findOne();
    if (!schedule) {
      schedule = new TaxSchedule({
        isPaused: false,
        nextReleaseYear: 2025,
        history: [
          { year: 2024, releasedAt: new Date("2024-04-01T09:00:00Z") },
          { year: 2023, releasedAt: new Date("2023-04-01T09:00:00Z") }
        ]
      });
      await schedule.save();
    }

    if (schedule.isPaused) {
      return;
    }

    const now = new Date();
    const nextYearToRelease = schedule.nextReleaseYear; // e.g. 2025

    // The release trigger date is April 1st of nextReleaseYear
    const triggerDate = new Date(`${nextYearToRelease}-04-01T00:00:00.000Z`);

    if (now >= triggerDate) {
      console.log(`[Auto-Release] Triggering automatic tax release for year ${nextYearToRelease}...`);

      const calculatedDueDate = new Date(`${nextYearToRelease + 1}-03-31T23:59:59.999Z`);

      // Single aggregation query to fetch the latest amount for each familyId and taxType combination
      const latestTaxes = await TaxBill.aggregate([
        { $sort: { year: -1 } },
        {
          $group: {
            _id: { familyId: "$familyId", taxType: "$taxType" },
            amount: { $first: "$amount" }
          }
        }
      ]);

      let createdCount = 0;
      let updatedCount = 0;

      for (const entry of latestTaxes) {
        const { familyId, taxType } = entry._id;
        const amount = entry.amount;

        if (taxType === "fine") continue;

        let bill = await TaxBill.findOne({
          familyId,
          taxType,
          year: nextYearToRelease
        });

        if (bill) {
          bill.amount = amount;
          bill.dueDate = calculatedDueDate;
          if (bill.paidAmount >= bill.amount) {
            bill.status = "paid";
          } else if (bill.paidAmount > 0) {
            bill.status = "partial";
          } else {
            bill.status = "pending";
          }
          await bill.save();
          updatedCount++;
        } else {
          bill = new TaxBill({
            familyId,
            taxType,
            year: nextYearToRelease,
            amount: amount,
            dueDate: calculatedDueDate,
            paidAmount: 0,
            status: "pending"
          });
          await bill.save();
          createdCount++;
        }
      }

      console.log(`[Auto-Release] Taxes released for ${nextYearToRelease}. Created: ${createdCount}, Updated: ${updatedCount}`);

      // Create auto-release notifications for all affected families
      const autoFamilyIds = [...new Set(latestTaxes.map(e => e._id.familyId).filter(id => latestTaxes.find(t => t._id.familyId === id && t._id.taxType !== "fine")))];
      const autoFyLabel = `${nextYearToRelease}-${nextYearToRelease + 1}`;
      const autoNotifs = autoFamilyIds.map(fId => ({
        familyId: fId,
        type: "auto_release",
        title: `स्वयंचलित कर आकारणी - वर्ष ${autoFyLabel}`,
        message: `वर्ष ${autoFyLabel} साठी स्वयंचलित कर आकारणी लागू झाली आहे. कृपया आपले कर तपशील तपासा.`,
        metadata: { year: nextYearToRelease },
        isRead: false,
      }));
      if (autoNotifs.length > 0) {
        await createBulkNotifications(conn, autoNotifs);
      }

      // Update schedule state
      schedule.history.push({
        year: nextYearToRelease,
        releasedAt: new Date()
      });
      schedule.nextReleaseYear = nextYearToRelease + 1;
      await schedule.save();
    }
  } catch (error) {
    console.error("[Auto-Release] Error checking/releasing taxes automatically:", error);
  }
};

// GET /api/admin/taxes/pending-families/:year
export const getPendingFamiliesForYear = wrapAsync(async (req, res) => {
  const { year } = req.params;
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const Family = conn.model("Family", FamilySchema);

  const targetYear = Number(year);

  // Find all bills for this year
  const bills = await TaxBill.find({ year: targetYear });

  // Group bills by familyId
  const familyBillsMap = {};
  for (const b of bills) {
    if (!familyBillsMap[b.familyId]) {
      familyBillsMap[b.familyId] = [];
    }
    familyBillsMap[b.familyId].push(b);
  }

  // Find all families to enrich the profile data
  const families = await Family.find();
  const familiesMap = {};
  for (const f of families) {
    familiesMap[f.familyId] = f;
  }

  const result = [];

  for (const [familyId, fBills] of Object.entries(familyBillsMap)) {
    let waterDue = 0;
    let waterPaid = 0;
    let houseDue = 0;
    let housePaid = 0;
    let fineDue = 0;
    let finePaid = 0;

    for (const b of fBills) {
      if (b.taxType === "samanya_water" || b.taxType === "vishesh_water") {
        waterDue += b.amount || 0;
        waterPaid += b.paidAmount || 0;
      } else if (b.taxType === "house" || b.taxType === "health" || b.taxType === "electricity") {
        houseDue += b.amount || 0;
        housePaid += b.paidAmount || 0;
      } else if (b.taxType === "fine") {
        fineDue += b.amount || 0;
        finePaid += b.paidAmount || 0;
      }
    }

    const waterPending = waterDue - waterPaid;
    const housePending = houseDue - housePaid;
    const finePending = fineDue - finePaid;
    const totalPending = waterPending + housePending + finePending;

    if (totalPending > 0) {
      const famProfile = familiesMap[familyId] || {
        mainMemberName: "Unknown",
        houseNumber: "N/A",
        email: "N/A"
      };

      result.push({
        familyId,
        headName: famProfile.mainMemberName,
        houseNumber: famProfile.houseNumber,
        email: famProfile.email,
        waterPending,
        housePending,
        finePending,
        totalPending
      });
    }
  }

  res.json(result);
});

// POST /api/admin/payments/offline-category
// Distributes a payment amount across unpaid/partial bills for a given category, oldest first
export const recordCategoryOfflinePayment = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const TaxBill = conn.model("TaxBill", TaxBillSchema);
  const PaymentHistory = conn.model("PaymentHistory", PaymentHistorySchema);
  const Family = conn.model("Family", FamilySchema);

  const { familyId, category, amount } = req.body;
  if (!familyId || !category || !amount || Number(amount) <= 0) {
    throw new ExpressError("familyId, category and a positive amount are required", 400);
  }

  const family = await Family.findOne({ familyId });
  if (!family) throw new ExpressError("Family not found", 404);

  // Map category to which taxTypes it covers
  const taxTypes = TAX_CATEGORY_TYPES[category];
  if (!taxTypes) throw new ExpressError("Invalid category. Must be water, house, or fine", 400);

  // Fetch all unpaid/partial bills for these taxTypes, sorted by year ASC (oldest first)
  const pendingBills = await TaxBill.find({
    familyId,
    taxType: { $in: taxTypes },
    status: { $in: ["pending", "partial"] },
  }).sort({ year: 1 });

  if (pendingBills.length === 0) {
    return res.status(200).json({ message: "No outstanding bills found for this category.", applied: 0 });
  }

  let remaining = Number(amount);
  const updatedBills = [];
  const allocations = [];

  for (const bill of pendingBills) {
    if (remaining <= 0) break;
    const due = bill.amount - (bill.paidAmount || 0);
    if (due <= 0) continue;

    const toPay = Math.min(due, remaining);
    bill.paidAmount = (bill.paidAmount || 0) + toPay;
    bill.status = bill.paidAmount >= bill.amount ? "paid" : "partial";
    remaining -= toPay;
    updatedBills.push(bill);
    allocations.push({
      billId: bill._id,
      year: bill.year,
      taxType: bill.taxType,
      amount: toPay,
    });
  }

  // Save updated bills
  await Promise.all(updatedBills.map((b) => b.save()));

  // Record a single payment history entry
  const categoryLabels = {
    water: "पाणीपट्टी (Water Tax)",
    house: "घरपट्टी व इतर (House + Health + Electricity)",
    fine: "दंड (Fines)",
  };

  await PaymentHistory.create({
    familyId,
    taxType: category,
    amountPaid: Number(amount) - remaining,
    paymentDate: new Date(),
    paymentMethod: "offline",
    transactionId: `OFFLINE-CAT-${Date.now()}`,
    notes: `Offline category payment: ${categoryLabels[category]}`,
    allocations,
  });

  res.json({
    message: `Payment of ₹${Number(amount) - remaining} applied successfully. Oldest arrears cleared first.`,
    applied: Number(amount) - remaining,
    leftover: remaining,
  });
});
