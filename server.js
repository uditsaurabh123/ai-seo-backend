// server.js - Backend API that also serves frontend pages

const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const Anthropic = require("@anthropic-ai/sdk");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins including chrome-extension://
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Initialize external SDKs only when credentials exist so the WorkYodha demo
// board can run locally without payment or AI-analysis environment variables.
const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  : null;

// In-memory session store (use Redis in production)
const paymentSessions = new Map();


// WorkYodha operational task board data store. This repository keeps the demo
// self-contained, while the shape mirrors MongoDB documents so it can be moved
// to Mongoose collections without changing the React client contract.
const workYodhaTasks = new Map(
  getSeedTasks().map((task) => [task.id, task])
);

function getSeedTasks() {
  return [
    {
      id: "task-001",
      title: "Inventory Reorder",
      department: "Operations",
      priority: "High",
      deadline: "2026-06-15T18:00:00.000Z",
      status: "Open",
      riskLevel: "High Risk",
      estimatedHours: 20,
      notes:
        "Reorder fast-moving SKUs before warehouse stock falls below minimum levels. Verify updated vendor quote and demand forecast.",
      assignee: {
        id: "emp-101",
        name: "Vikram Singh",
        role: "Operations Executive",
        department: "Operations",
        workload: 78,
        hourlyCost: 360,
        avatar: "VS",
      },
      reviewer: {
        id: "rev-201",
        name: "Neha Kapoor",
        role: "Operations Manager",
        department: "Operations",
        approvalStatus: "Waiting for Evidence",
        pendingReviews: 6,
        responsibility: "Validate inventory quantities, vendor terms, and final reorder approval.",
        avatar: "NK",
      },
      evidence: [
        { id: "ev-001", type: "Stock Report", format: "PDF", status: "Approved" },
        { id: "ev-002", type: "Vendor Quote", format: "XLSX", status: "Pending" },
        { id: "ev-003", type: "Demand Forecast", format: "XLSX", status: "Requested Changes" },
      ],
    },
    {
      id: "task-002",
      title: "Invoice Verification",
      department: "Finance",
      priority: "High",
      deadline: "2026-06-13T12:00:00.000Z",
      status: "In Review",
      riskLevel: "High Risk",
      estimatedHours: 3.5,
      notes: "Verify supplier invoice values against purchase order, tax fields, and expense log before payment release.",
      assignee: {
        id: "emp-102",
        name: "Anika Verma",
        role: "Finance Executive",
        department: "Finance",
        workload: 64,
        hourlyCost: 720,
        avatar: "AV",
      },
      reviewer: {
        id: "rev-202",
        name: "Rahul Mehta",
        role: "Finance Manager",
        department: "Finance",
        approvalStatus: "In Review",
        pendingReviews: 4,
        responsibility: "Confirm compliance, payment readiness, and ledger accuracy.",
        avatar: "RM",
      },
      evidence: [
        { id: "ev-004", type: "Invoice PDF", format: "PDF", status: "Approved" },
        { id: "ev-005", type: "Expense Log", format: "XLSX", status: "Approved" },
        { id: "ev-006", type: "Approval Note", format: "NOTE", status: "Pending" },
      ],
    },
    {
      id: "task-003",
      title: "Onboarding Packet Review",
      department: "HR",
      priority: "Medium",
      deadline: "2026-06-22T16:00:00.000Z",
      status: "Open",
      riskLevel: "Medium Risk",
      estimatedHours: 1.5,
      notes: "Review new-hire onboarding packet for completeness before HRIS activation.",
      assignee: {
        id: "emp-103",
        name: "Priya Nair",
        role: "HR Executive",
        department: "HR",
        workload: 52,
        hourlyCost: 410,
        avatar: "PN",
      },
      reviewer: {
        id: "rev-203",
        name: "Sarah Iyer",
        role: "HR Manager",
        department: "HR",
        approvalStatus: "Not Started",
        pendingReviews: 3,
        responsibility: "Approve identification proof, offer letter, and onboarding checklist.",
        avatar: "SI",
      },
      evidence: [
        { id: "ev-007", type: "Offer Letter", format: "DOC", status: "Approved" },
        { id: "ev-008", type: "ID Proof", format: "PDF", status: "Pending" },
        { id: "ev-009", type: "Checklist", format: "FORM", status: "Pending" },
      ],
    },
    {
      id: "task-004",
      title: "Lead Follow-up",
      department: "Sales",
      priority: "Urgent",
      deadline: "2026-06-12T15:00:00.000Z",
      status: "Blocked",
      riskLevel: "High Risk",
      estimatedHours: 1,
      notes: "Follow up on enterprise lead and attach call log, thread screenshot, and proposal URL.",
      assignee: {
        id: "emp-104",
        name: "Karan Malhotra",
        role: "Sales Executive",
        department: "Sales",
        workload: 88,
        hourlyCost: 410,
        avatar: "KM",
      },
      reviewer: {
        id: "rev-204",
        name: "Meera Joshi",
        role: "Sales Manager",
        department: "Sales",
        approvalStatus: "Blocked",
        pendingReviews: 8,
        responsibility: "Approve customer response quality and next-step commitment.",
        avatar: "MJ",
      },
      evidence: [
        { id: "ev-010", type: "Call Log", format: "CSV", status: "Pending" },
        { id: "ev-011", type: "Email Thread", format: "URL", status: "Rejected" },
        { id: "ev-012", type: "Proposal URL", format: "URL", status: "Pending" },
      ],
    },
    {
      id: "task-005",
      title: "Vendor Onboarding",
      department: "Finance",
      priority: "Medium",
      deadline: "2026-06-19T10:00:00.000Z",
      status: "In Review",
      riskLevel: "Medium Risk",
      estimatedHours: 2,
      notes: "Complete vendor risk packet and confirm bank details before procurement activation.",
      assignee: {
        id: "emp-105",
        name: "Rahul Mehta",
        role: "Finance Manager",
        department: "Finance",
        workload: 72,
        hourlyCost: 900,
        avatar: "RM",
      },
      reviewer: {
        id: "rev-205",
        name: "Pooja Iyer",
        role: "Procurement Lead",
        department: "Operations",
        approvalStatus: "In Review",
        pendingReviews: 5,
        responsibility: "Review KYC documents, bank proof, and procurement compliance.",
        avatar: "PI",
      },
      evidence: [
        { id: "ev-013", type: "Vendor Form", format: "FORM", status: "Approved" },
        { id: "ev-014", type: "KYC Docs", format: "PDF", status: "Approved" },
        { id: "ev-015", type: "Bank Proof", format: "PDF", status: "Pending" },
      ],
    },
    {
      id: "task-006",
      title: "Supplier Performance Review",
      department: "Operations",
      priority: "Medium",
      deadline: "2026-06-24T17:30:00.000Z",
      status: "Pending Review",
      riskLevel: "Medium Risk",
      estimatedHours: 3,
      notes: "Score supplier performance using SLA feedback, defect report, and renewal recommendation.",
      assignee: {
        id: "emp-106",
        name: "Neha Kapoor",
        role: "Operations Manager",
        department: "Operations",
        workload: 81,
        hourlyCost: 850,
        avatar: "NK",
      },
      reviewer: {
        id: "rev-206",
        name: "Arun Desai",
        role: "Supply Chain Head",
        department: "Operations",
        approvalStatus: "Pending Approval",
        pendingReviews: 9,
        responsibility: "Approve renewal recommendation and supplier performance score.",
        avatar: "AD",
      },
      evidence: [
        { id: "ev-016", type: "Scorecard", format: "XLSX", status: "Approved" },
        { id: "ev-017", type: "Feedback", format: "DOC", status: "Approved" },
        { id: "ev-018", type: "Defect Report", format: "PDF", status: "Pending" },
      ],
    },
    {
      id: "task-007",
      title: "Policy Acknowledgement",
      department: "HR",
      priority: "Low",
      deadline: "2026-06-18T09:30:00.000Z",
      status: "Open",
      riskLevel: "Low Risk",
      estimatedHours: 0.5,
      notes: "Collect employee acknowledgement for revised hybrid work policy.",
      assignee: {
        id: "emp-107",
        name: "Sarah Iyer",
        role: "HR Manager",
        department: "HR",
        workload: 44,
        hourlyCost: 790,
        avatar: "SI",
      },
      reviewer: {
        id: "rev-207",
        name: "Arjun Nair",
        role: "HR Director",
        department: "HR",
        approvalStatus: "Not Started",
        pendingReviews: 2,
        responsibility: "Confirm policy acknowledgement coverage and escalation list.",
        avatar: "AN",
      },
      evidence: [
        { id: "ev-019", type: "Signed Acknowledgement", format: "PDF", status: "Pending" },
        { id: "ev-020", type: "Policy Doc", format: "DOC", status: "Approved" },
      ],
    },
    {
      id: "task-008",
      title: "Customer Refund Approval",
      department: "Sales",
      priority: "Medium",
      deadline: "2026-06-20T11:00:00.000Z",
      status: "Pending Review",
      riskLevel: "Medium Risk",
      estimatedHours: 2.5,
      notes: "Verify customer refund eligibility and attach payment proof before finance approval.",
      assignee: {
        id: "emp-108",
        name: "Meera Joshi",
        role: "Sales Manager",
        department: "Sales",
        workload: 69,
        hourlyCost: 820,
        avatar: "MJ",
      },
      reviewer: {
        id: "rev-208",
        name: "Siddhant Bedi",
        role: "Finance Lead",
        department: "Finance",
        approvalStatus: "Pending Approval",
        pendingReviews: 7,
        responsibility: "Approve refund amount, payment proof, and customer note.",
        avatar: "SB",
      },
      evidence: [
        { id: "ev-021", type: "Refund Form", format: "FORM", status: "Approved" },
        { id: "ev-022", type: "Payment Proof", format: "PDF", status: "Pending" },
        { id: "ev-023", type: "Customer Note", format: "NOTE", status: "Pending" },
      ],
    },
  ];
}

function decorateTask(task) {
  const now = Date.now();
  const due = new Date(task.deadline).getTime();
  const hoursRemaining = Math.round(((due - now) / (1000 * 60 * 60)) * 10) / 10;
  const overdue = hoursRemaining < 0;
  const laborCost = Math.round(task.estimatedHours * task.assignee.hourlyCost);
  const missingEvidence = task.evidence.filter((item) => item.status !== "Approved").length;

  return {
    ...task,
    hoursRemaining,
    overdue,
    delayed: overdue || task.status === "Blocked",
    waitingForReview: ["In Review", "Pending Review"].includes(task.status),
    laborCost,
    missingEvidence,
  };
}

function getVisibleTasks(role, personId) {
  const tasks = Array.from(workYodhaTasks.values()).map(decorateTask);

  if (role === "employee" && personId) {
    return tasks.filter((task) => task.assignee.id === personId);
  }

  if (role === "reviewer" && personId) {
    return tasks.filter((task) => task.reviewer.id === personId || task.waitingForReview);
  }

  return tasks;
}

function buildTaskBoardPayload(role = "admin", personId) {
  const tasks = getVisibleTasks(role, personId);
  const departments = {};
  const employees = {};
  const reviewers = {};

  tasks.forEach((task) => {
    const department = departments[task.department] || {
      name: task.department,
      tasks: 0,
      totalHours: 0,
      totalCost: 0,
      highRisk: 0,
      delayed: 0,
    };
    department.tasks += 1;
    department.totalHours += task.estimatedHours;
    department.totalCost += task.laborCost;
    if (task.riskLevel === "High Risk") department.highRisk += 1;
    if (task.delayed) department.delayed += 1;
    departments[task.department] = department;

    employees[task.assignee.id] = employees[task.assignee.id] || {
      ...task.assignee,
      assignedTasks: 0,
      totalHours: 0,
      totalCost: 0,
    };
    employees[task.assignee.id].assignedTasks += 1;
    employees[task.assignee.id].totalHours += task.estimatedHours;
    employees[task.assignee.id].totalCost += task.laborCost;

    reviewers[task.reviewer.id] = reviewers[task.reviewer.id] || {
      ...task.reviewer,
      reviewTasks: 0,
    };
    reviewers[task.reviewer.id].reviewTasks += 1;
  });

  const totals = tasks.reduce(
    (summary, task) => {
      summary.openTasks += task.status !== "Completed" ? 1 : 0;
      summary.pendingReviews += task.waitingForReview ? 1 : 0;
      summary.totalHours += task.estimatedHours;
      summary.totalCost += task.laborCost;
      summary.deadlineRisks += task.riskLevel === "High Risk" || task.delayed ? 1 : 0;
      summary.missingEvidence += task.missingEvidence;
      return summary;
    },
    {
      openTasks: 0,
      pendingReviews: 0,
      totalHours: 0,
      totalCost: 0,
      deadlineRisks: 0,
      missingEvidence: 0,
    }
  );

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      role,
      personId: personId || null,
      persistence: process.env.MONGODB_URI
        ? "MongoDB-ready API contract; configure a Mongoose model in production."
        : "In-memory demo store; set MONGODB_URI and map these documents to MongoDB for production.",
    },
    totals,
    departments: Object.values(departments),
    employees: Object.values(employees),
    reviewers: Object.values(reviewers),
    tasks,
  };
}

function mergeEvidence(existingEvidence, updates = []) {
  return existingEvidence.map((item) => {
    const update = updates.find((candidate) => candidate.id === item.id);
    return update ? { ...item, ...update } : item;
  });
}

/**
 * SERVE UPGRADE PAGE
 * GET /upgrade
 * This is the main payment page that extension redirects to
 */
app.get("/upgrade", (req, res) => {
  const { session, ext } = req.query;

  // Validate parameters
  if (!session || !ext) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Request</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20px;
          }
          .error-box {
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
          }
          h1 { color: #ef4444; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h1>⚠️ Invalid Request</h1>
          <p>This payment link is invalid or expired. Please try again from the Chrome extension.</p>
        </div>
      </body>
      </html>
    `);
  }

  // Serve the upgrade page with session data embedded
  res.send(getUpgradePageHTML(session, ext));
});

/**
 * SERVE SUCCESS PAGE
 * GET /upgrade/success
 */
app.get("/upgrade/success", (req, res) => {
  const { paymentId } = req.query;
  res.send(getSuccessPageHTML(paymentId));
});

/**
 * CREATE PAYMENT ORDER ENDPOINT
 * POST /api/payment/create-order
 */
app.post("/api/payment/create-order", async (req, res) => {
  try {
    const { amount, currency, notes } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        error: "Amount and currency are required",
      });
    }

    const { sessionId, extensionId } = notes || {};

    if (!sessionId || !extensionId) {
      return res.status(400).json({
        success: false,
        error: "Session ID and Extension ID are required",
      });
    }

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        error: "Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      });
    }

    // Create Razorpay order
    const options = {
      amount: amount,
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: notes,
    };

    const order = await razorpay.orders.create(options);

    // Store session data
    paymentSessions.set(sessionId, {
      orderId: order.id,
      extensionId: extensionId,
      amount: amount,
      currency: currency,
      createdAt: new Date().toISOString(),
      status: "pending",
    });

    console.log("Order created:", {
      orderId: order.id,
      sessionId: sessionId,
      extensionId: extensionId,
    });

    // Clean up old sessions
    cleanupOldSessions();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID, // Send key ID to frontend
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create order",
    });
  }
});

/**
 * VERIFY PAYMENT ENDPOINT
 * POST /api/payment/verify
 */
app.post("/api/payment/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      sessionId,
      extensionId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing payment details",
      });
    }

    const session = paymentSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired session",
      });
    }

    if (session.orderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        error: "Order ID mismatch",
      });
    }

    if (session.extensionId !== extensionId) {
      return res.status(400).json({
        success: false,
        error: "Extension ID mismatch",
      });
    }

    // Verify Razorpay signature
    const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(signatureBody)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(razorpay_signature, "hex")
    );

    if (isValid) {
      const userId = generateUserId();

      // Update session status
      session.status = "completed";
      session.paymentId = razorpay_payment_id;
      session.userId = userId;
      session.completedAt = new Date().toISOString();

      console.log("Payment verified successfully:", {
        sessionId: sessionId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        userId: userId,
      });

      res.json({
        success: true,
        verified: true,
        userId: userId,
        paymentId: razorpay_payment_id,
        message: "Payment verified successfully",
      });
    } else {
      console.error("Payment verification failed:", {
        sessionId: sessionId,
        orderId: razorpay_order_id,
      });

      res.status(400).json({
        success: false,
        verified: false,
        error: "Invalid payment signature",
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      error: "Payment verification failed",
    });
  }
});

/**
 * AI ANALYSIS ENDPOINT
 * POST /api/analyze
 */
app.post("/api/analyze", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Prompt is required",
      });
    }

    if (!anthropic) {
      return res.status(503).json({
        success: false,
        error: "AI analysis is not configured. Set ANTHROPIC_API_KEY.",
      });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const analysisText = message.content[0].text;

    let analysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = {
          score: 70,
          scoreDescription: "Analysis completed",
          recommendations: [analysisText],
        };
      }
    } catch (parseError) {
      analysis = {
        score: 70,
        scoreDescription: "Analysis completed",
        recommendations: [analysisText],
      };
    }

    res.json({
      success: true,
      analysis: analysis,
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    res.status(500).json({
      success: false,
      error: "Analysis failed",
    });
  }
});



/**
 * WORKYODHA TASK BOARD API
 * GET /api/workyodha/board?role=admin|manager|reviewer|employee|executive&personId=emp-101
 */
app.get("/api/workyodha/board", (req, res) => {
  const { role = "admin", personId } = req.query;
  res.json({
    success: true,
    board: buildTaskBoardPayload(role, personId),
  });
});

/**
 * UPDATE TASK OR EVIDENCE STATUS
 * PATCH /api/workyodha/tasks/:taskId
 */
app.patch("/api/workyodha/tasks/:taskId", (req, res) => {
  const { taskId } = req.params;
  const existingTask = workYodhaTasks.get(taskId);

  if (!existingTask) {
    return res.status(404).json({
      success: false,
      error: "Task not found",
    });
  }

  const allowedUpdates = [
    "title",
    "department",
    "priority",
    "deadline",
    "status",
    "riskLevel",
    "estimatedHours",
    "notes",
  ];

  const nextTask = { ...existingTask };
  allowedUpdates.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      nextTask[key] = req.body[key];
    }
  });

  if (req.body.assignee) {
    nextTask.assignee = { ...existingTask.assignee, ...req.body.assignee };
  }

  if (req.body.reviewer) {
    nextTask.reviewer = { ...existingTask.reviewer, ...req.body.reviewer };
  }

  if (Array.isArray(req.body.evidence)) {
    nextTask.evidence = mergeEvidence(existingTask.evidence, req.body.evidence);
  }

  workYodhaTasks.set(taskId, nextTask);

  res.json({
    success: true,
    task: decorateTask(nextTask),
    board: buildTaskBoardPayload(req.body.role || "admin", req.body.personId),
  });
});

/**
 * HEALTH CHECK
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AI SEO Analyzer API is running",
    timestamp: new Date().toISOString(),
    activeSessions: paymentSessions.size,
  });
});

/**
 * Helper: Generate unique user ID
 */
function generateUserId() {
  return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

/**
 * Helper: Clean up old sessions
 */
function cleanupOldSessions() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  for (const [sessionId, session] of paymentSessions.entries()) {
    const createdAt = new Date(session.createdAt);
    if (createdAt < oneHourAgo && session.status === "pending") {
      paymentSessions.delete(sessionId);
      console.log("Cleaned up expired session:", sessionId);
    }
  }
}

// Run cleanup every 30 minutes without keeping test processes alive.
const cleanupInterval = setInterval(cleanupOldSessions, 30 * 60 * 1000);
cleanupInterval.unref();

/**
 * HTML TEMPLATES
 */

// Get upgrade page HTML
function getUpgradePageHTML(sessionId, extensionId) {
  // Get server URL dynamically
  const serverUrl =
    process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upgrade to Premium - AI SEO Analyzer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      padding: 40px;
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 48px; margin-bottom: 10px; }
    h1 { color: #333; font-size: 32px; margin-bottom: 10px; }
    .tagline { color: #666; font-size: 16px; }
    .pricing-card {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      margin: 30px 0;
    }
    .price { font-size: 56px; font-weight: bold; margin: 20px 0; }
    .price-period { font-size: 18px; opacity: 0.9; }
    .features {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 15px;
      margin: 20px 0;
    }
    .features h3 { color: #333; margin-bottom: 20px; font-size: 20px; }
    .feature-list { list-style: none; }
    .feature-list li {
      padding: 12px 0;
      color: #555;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .feature-list li:before {
      content: "✓";
      color: #10b981;
      font-weight: bold;
      font-size: 20px;
    }
    .payment-btn {
      width: 100%;
      padding: 18px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 20px;
    }
    .payment-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
    }
    .payment-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .status-message {
      text-align: center;
      padding: 15px;
      margin: 20px 0;
      border-radius: 10px;
      display: none;
    }
    .status-message.success { background: #d1fae5; color: #065f46; display: block; }
    .status-message.error { background: #fee2e2; color: #991b1b; display: block; }
    .status-message.loading { background: #dbeafe; color: #1e40af; display: block; }
    .security-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #666;
      font-size: 14px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🚀</div>
      <h1>Upgrade to Premium</h1>
      <p class="tagline">Unlock unlimited AI-powered SEO analysis</p>
    </div>

    <div class="pricing-card">
      <div>Premium Access</div>
      <div class="price">₹499</div>
      <div class="price-period">One-time payment • Lifetime access</div>
    </div>

    <div class="features">
      <h3>What You'll Get:</h3>
      <ul class="feature-list">
        <li>Unlimited page analysis</li>
        <li>AI-powered SEO recommendations</li>
        <li>Comprehensive technical SEO audit</li>
        <li>Content optimization suggestions</li>
        <li>Competitor insights</li>
        <li>Priority support</li>
        <li>Lifetime updates</li>
      </ul>
    </div>

    <div id="status-message" class="status-message"></div>

    <button id="payment-btn" class="payment-btn">Proceed to Payment</button>

    <div class="security-badge">
      <span>🔒 Secured by Razorpay • 256-bit encryption</span>
    </div>

    <div class="footer">
      <p>By completing this purchase, you agree to our Terms of Service and Privacy Policy</p>
    </div>
  </div>

  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    const CONFIG = {
      serverUrl: '${serverUrl}',
      sessionId: '${sessionId}',
      extensionId: '${extensionId}'
    };

    const paymentBtn = document.getElementById('payment-btn');
    const statusMessage = document.getElementById('status-message');

    function showStatus(type, message) {
      statusMessage.textContent = message;
      statusMessage.className = \`status-message \${type}\`;
    }

    function hideStatus() {
      statusMessage.style.display = 'none';
    }

    paymentBtn.addEventListener('click', async () => {
      try {
        paymentBtn.disabled = true;
        paymentBtn.textContent = 'Processing...';
        showStatus('loading', 'Creating payment order...');

        const orderResponse = await fetch(\`\${CONFIG.serverUrl}/api/payment/create-order\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 49900,
            currency: 'INR',
            notes: {
              sessionId: CONFIG.sessionId,
              extensionId: CONFIG.extensionId,
              product: 'AI SEO Analyzer Pro'
            }
          })
        });

        if (!orderResponse.ok) throw new Error('Failed to create order');

        const orderData = await orderResponse.json();
        hideStatus();

        // Open Razorpay checkout
        const options = {
          key: orderData.razorpayKeyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'AI SEO Analyzer Pro',
          description: 'Premium Lifetime Access',
          order_id: orderData.orderId,
          handler: async function(response) {
            await handlePaymentSuccess(response);
          },
          theme: { color: '#667eea' },
          modal: {
            ondismiss: function() {
              showStatus('error', 'Payment cancelled.');
              paymentBtn.disabled = false;
              paymentBtn.textContent = 'Proceed to Payment';
            }
          }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();

      } catch (error) {
        console.error('Payment error:', error);
        showStatus('error', 'Failed to initiate payment. Please try again.');
        paymentBtn.disabled = false;
        paymentBtn.textContent = 'Proceed to Payment';
      }
    });

    async function handlePaymentSuccess(paymentResponse) {
      try {
        showStatus('loading', 'Verifying payment...');
        paymentBtn.disabled = true;

        const verifyResponse = await fetch(\`\${CONFIG.serverUrl}/api/payment/verify\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
            sessionId: CONFIG.sessionId,
            extensionId: CONFIG.extensionId
          })
        });

        if (!verifyResponse.ok) throw new Error('Verification failed');

        const verifyData = await verifyResponse.json();

        if (verifyData.verified) {
          showStatus('success', '🎉 Payment successful! Activating...');
          await activateExtension(verifyData);
          
          setTimeout(() => {
            window.location.href = \`\${CONFIG.serverUrl}/upgrade/success?paymentId=\${verifyData.paymentId}\`;
          }, 2000);
        } else {
          throw new Error('Verification failed');
        }

      } catch (error) {
        console.error('Verification error:', error);
        showStatus('error', \`Error: \${error.message}\`);
      }
    }

    async function activateExtension(verifyData) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(
            CONFIG.extensionId,
            {
              action: 'paymentSuccess',
              sessionId: CONFIG.sessionId,
              userId: verifyData.userId,
              paymentId: verifyData.paymentId
            }
          );
        }
      } catch (error) {
        console.error('Extension activation error:', error);
      }
    }
  </script>
</body>
</html>
  `;
}

// Get success page HTML
function getSuccessPageHTML(paymentId) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 100%;
      padding: 50px 40px;
      text-align: center;
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .success-icon {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30px;
      font-size: 50px;
    }
    h1 { color: #333; font-size: 32px; margin-bottom: 15px; }
    .subtitle { color: #666; font-size: 18px; margin-bottom: 30px; }
    .info-box {
      background: #f8f9fa;
      padding: 25px;
      border-radius: 12px;
      margin: 30px 0;
      text-align: left;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-item:last-child { border-bottom: none; }
    .info-label { color: #666; font-weight: 500; }
    .info-value { color: #333; font-weight: 600; }
    .steps {
      background: #dbeafe;
      padding: 25px;
      border-radius: 12px;
      margin: 30px 0;
      text-align: left;
    }
    .steps h3 { color: #1e40af; margin-bottom: 15px; }
    .steps ol { padding-left: 20px; color: #1e3a8a; }
    .steps li { padding: 8px 0; }
    .btn {
      display: inline-block;
      padding: 15px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      margin: 10px;
      border: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✓</div>
    <h1>🎉 Payment Successful!</h1>
    <p class="subtitle">Your premium access has been activated</p>

    <div class="info-box">
      <div class="info-item">
        <span class="info-label">Plan</span>
        <span class="info-value">Premium Lifetime</span>
      </div>
      <div class="info-item">
        <span class="info-label">Amount Paid</span>
        <span class="info-value">₹499</span>
      </div>
      <div class="info-item">
        <span class="info-label">Payment ID</span>
        <span class="info-value">${paymentId || "N/A"}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Date</span>
        <span class="info-value">${new Date().toLocaleDateString()}</span>
      </div>
    </div>

    <div class="steps">
      <h3>Next Steps</h3>
      <ol>
        <li>Your Chrome extension has been upgraded to Premium</li>
        <li>Close this page and return to your browser</li>
        <li>Click the AI SEO Analyzer extension icon</li>
        <li>Start analyzing any webpage with unlimited AI-powered insights!</li>
      </ol>
    </div>

    <button class="btn" onclick="window.close()">Close This Page</button>
  </div>

  <script>
    // Auto-close after 10 seconds
    setTimeout(() => {
      if (confirm('Close this page?')) window.close();
    }, 10000);
  </script>
</body>
</html>
  `;
}

// Error handling
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`WorkYodha MERN task board API running on port ${PORT}`);
    console.log(`Interactive board available at: http://localhost:${PORT}/`);
    console.log(`Payment page available at: http://localhost:${PORT}/upgrade`);
  });
}

module.exports = app;
