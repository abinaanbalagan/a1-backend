require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: "https://a1repairservice.in"
}));
app.use(express.json());

/* =========================
   MongoDB Connection
========================= */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo Error:", err));

/* =========================
   Booking Schema
========================= */
const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  service: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  address: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model("Booking", bookingSchema);

/* =========================
   Nodemailer Setup (Owner only)
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,      // your Gmail
    pass: process.env.EMAIL_PASS       // App Password
  }
});

/* =========================
   BOOKING API (No email to customer)
========================= */
app.post("/api/book", async (req, res) => {
  try {
    const { name, phone, service, date, time, address } = req.body;

    if (!name || !phone || !service || !date || !time || !address) {
      return res.status(400).json({ message: "All fields required" });
    }

    const newBooking = new Booking({ name, phone, service, date, time, address });
    const savedBooking = await newBooking.save();

    // Only respond to frontend
    res.status(200).json({ message: "Booking successful", bookingId: savedBooking._id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET ALL BOOKINGS
========================= */
app.get("/api/bookings", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   DAILY SUMMARY EMAIL
========================= */
const sendDailyBookingsEmail = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const bookings = await Booking.find({ date: today });

    if (!bookings.length) return; // No bookings today

    let emailBody = "<h2>Today's Bookings</h2><ul>";
    bookings.forEach(b => {
      emailBody += `<li>${b.name} - ${b.service} - ${b.time} - ${b.phone}</li>`;
    });
    emailBody += "</ul>";

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.CLIENT_EMAIL,   // your email
      subject: `Daily Bookings - ${today}`,
      html: emailBody
    });

    console.log("Daily booking summary sent!");

  } catch (err) {
    console.error("Daily email error:", err);
  }
};

// Schedule daily email at 8:00 PM server time
cron.schedule("0 20 * * *", () => {
  sendDailyBookingsEmail();
});

/* =========================
   START SERVER
========================= */
app.get("/", (req, res) => {
  res.send("A1 Repair Service API Running");
});
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));