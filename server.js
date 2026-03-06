require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

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

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.error("MongoDB Connection Error:", err));

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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Booking = mongoose.model("Booking", bookingSchema);

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