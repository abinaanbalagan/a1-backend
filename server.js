require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 5000;

/* =========================
   Middleware
========================= */

app.use(cors({
  origin: [
    "https://a1repairservice.in",
    "https://www.a1repairservice.in"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

/* =========================
   MongoDB Connection
========================= */

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

/* =========================
   Booking Schema
========================= */

const bookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  service: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Booking = mongoose.model("Booking", bookingSchema);

/* =========================
   Nodemailer Setup
========================= */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =========================
   CREATE BOOKING
========================= */

app.post("/api/book", async (req, res) => {
  try {

    const { name, phone, service, date, time, address } = req.body;

    if (!name || !phone || !service || !date || !time || !address) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const booking = new Booking({
      name,
      phone,
      service,
      date,
      time,
      address
    });

    const savedBooking = await booking.save();

    res.status(200).json({
      message: "Booking successful",
      bookingId: savedBooking._id
    });

  } catch (error) {

    console.error("Booking Error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
});

/* =========================
   GET ALL BOOKINGS
========================= */

app.get("/api/bookings", async (req, res) => {
  try {

    const bookings = await Booking
      .find()
      .sort({ createdAt: -1 });

    res.json(bookings);

  } catch (error) {

    console.error("Fetch Error:", error);

    res.status(500).json({
      message: "Server error"
    });

  }
});

/* =========================
   DAILY SUMMARY EMAIL
========================= */

const sendDailyBookingsEmail = async () => {

  try {

    const today = new Date().toISOString().split("T")[0];

    const bookings = await Booking.find({ date: today });

    if (!bookings.length) {
      console.log("No bookings today");
      return;
    }

    let emailBody = "<h2>Today's Bookings</h2><ul>";

    bookings.forEach(b => {
      emailBody += `
        <li>
          ${b.name} - ${b.service} - ${b.time} - ${b.phone}
        </li>
      `;
    });

    emailBody += "</ul>";

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.CLIENT_EMAIL,
      subject: `Daily Bookings - ${today}`,
      html: emailBody
    });

    console.log("Daily booking summary email sent");

  } catch (error) {

    console.error("Daily Email Error:", error);

  }

};

/* =========================
   CRON JOB (8 PM IST)
========================= */

cron.schedule(
  "0 20 * * *",
  sendDailyBookingsEmail,
  {
    timezone: "Asia/Kolkata"
  }
);

/* =========================
   ROOT ROUTE
========================= */

app.get("/", (req, res) => {
  res.send("A1 Repair Service API Running");
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});