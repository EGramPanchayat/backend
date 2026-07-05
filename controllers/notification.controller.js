import wrapAsync from "../utils/wrapAsync.js";
import NotificationSchema from "../DB/models/notification.js";

// Tax type labels for notification messages
const taxTypeLabelsMarathi = {
  samanya_water: "सामान्य पाणीपट्टी",
  vishesh_water: "विशेष पाणीपट्टी",
  house: "घरपट्टी",
  health: "आरोग्य कर",
  electricity: "वीज कर",
  fine: "दंड",
  water: "पाणीपट्टी",
};

/**
 * Helper: Create a notification record
 * Can be called from any controller to log activity
 */
export const createNotification = async (conn, { familyId, type, title, message, metadata = {} }) => {
  try {
    const Notification = conn.model("Notification", NotificationSchema);
    const notification = new Notification({
      familyId,
      type,
      title,
      message,
      metadata,
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("[Notification] Error creating notification:", error.message);
    // Don't throw — notifications are non-critical
  }
};

/**
 * Helper: Create bulk notifications for multiple families
 */
export const createBulkNotifications = async (conn, notifications) => {
  try {
    const Notification = conn.model("Notification", NotificationSchema);
    await Notification.insertMany(notifications);
  } catch (error) {
    console.error("[Notification] Error creating bulk notifications:", error.message);
  }
};

/**
 * GET /api/admin/notifications
 * Admin: Get all notifications (paginated, most recent first)
 */
export const getAdminNotifications = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Notification = conn.model("Notification", NotificationSchema);

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(),
  ]);

  res.json({
    notifications,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

/**
 * GET /api/user/notifications
 * User: Get notifications for a specific family
 */
export const getUserNotifications = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Notification = conn.model("Notification", NotificationSchema);

  const familyId = req.user?.familyId;
  if (!familyId) {
    return res.status(400).json({ error: "Family ID not found in session" });
  }

  const notifications = await Notification.find({ familyId })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({ familyId, isRead: false });

  res.json({ notifications, unreadCount });
});

/**
 * PATCH /api/user/notifications/:id/read
 * User: Mark a notification as read
 */
export const markNotificationRead = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Notification = conn.model("Notification", NotificationSchema);

  const { id } = req.params;
  const familyId = req.user?.familyId;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, familyId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ error: "Notification not found" });
  }

  res.json({ success: true, notification });
});

/**
 * PATCH /api/user/notifications/read-all
 * User: Mark all notifications as read
 */
export const markAllNotificationsRead = wrapAsync(async (req, res) => {
  const conn = req.dbConnection;
  const Notification = conn.model("Notification", NotificationSchema);

  const familyId = req.user?.familyId;
  if (!familyId) {
    return res.status(400).json({ error: "Family ID not found in session" });
  }

  await Notification.updateMany({ familyId, isRead: false }, { isRead: true });
  res.json({ success: true });
});

export { taxTypeLabelsMarathi };
