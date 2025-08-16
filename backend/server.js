const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/car_rental', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// ====== User Schema ======
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    phone: String,
    password: String,
    role: String, // 'customer', 'rider', 'admin'
});
const User = mongoose.model('User', userSchema);

// ====== Booking Schema ======
const bookingSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    car: String,
    bookingDate: { type: Date, default: Date.now },
    otp: String,
    otpExpiresAt: Date
});
const Booking = mongoose.model('Booking', bookingSchema);

// ====== Email Transporter (Gmail SMTP) ======
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "dheepishah3518@gmail.com", // your email
        pass: "vjpw akew ihei gjlo"   // app password from Gmail
    }
});

// ====== Helper to Generate OTP ======
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ====== Signup Route ======
app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        if (!name || !email || !phone || !password || !role) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, phone, password: hashedPassword, role });
        await user.save();
        res.status(201).json({ message: 'Signup successful' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ====== Login Route ======
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const user = await User.findOne({ email, role });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, role: user.role, name: user.name, email: user.email },
            'your_jwt_secret',
            { expiresIn: '2h' }
        );
        res.json({ message: 'Login successful', token, user: { name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ====== Booking Route (Sends OTP) ======
app.post('/api/book', async (req, res) => {
    try {
        const { email, car } = req.body;
        if (!email || !car) {
            return res.status(400).json({ message: "Email and car are required" });
        }
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const otp = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

        const booking = new Booking({ userId: user._id, car, otp, otpExpiresAt });
        await booking.save();

        // Send OTP Email
        await transporter.sendMail({
            from: '"Car Rental" <dheepishah3518@gmail.com>',
            to: user.email,
            subject: "Your Booking OTP",
            text: `Hello ${user.name},\n\nYour OTP for booking ${car} is ${otp}.\nIt will expire in 5 minutes.`
        });

        res.json({ message: "Booking created & OTP sent to your email", bookingId: booking._id });
    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ====== Verify OTP Route ======
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { bookingId, otp } = req.body;
        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: "Booking not found" });

        if (new Date() > booking.otpExpiresAt) {
            return res.status(400).json({ message: "OTP expired" });
        }

        if (booking.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        res.json({ message: "OTP verified successfully" });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ====== Start Server ======
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





// const express = require('express');
// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const cors = require('cors');

// const app = express();
// app.use(express.json());
// app.use(cors());

// // MongoDB connection
// mongoose.connect('mongodb://localhost:27017/car_rental', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

// // User Schema
// const userSchema = new mongoose.Schema({
//     name: String,
//     email: { type: String, unique: true },
//     phone: String,
//     password: String,
//     role: String, // 'customer', 'rider', 'admin'
// });

// const User = mongoose.model('User', userSchema);

// // Signup Route
// app.post('/api/signup', async (req, res) => {
//     try {
//         console.log('Signup payload:', req.body);
//         const { name, email, phone, password, role } = req.body;
//         if (!name || !email || !phone || !password || !role) {
//             console.log('Missing field');
//             return res.status(400).json({ message: 'All fields are required' });
//         }
//         const existing = await User.findOne({ email });
//         if (existing) {
//             console.log('Email exists');
//             return res.status(400).json({ message: 'Email already exists' });
//         }
//         const hashedPassword = await bcrypt.hash(password, 10);
//         const user = new User({ name, email, phone, password: hashedPassword, role });
//         await user.save();
//         console.log('User saved:', user);
//         res.status(201).json({ message: 'Signup successful' });
//     } catch (err) {
//         console.error('Signup error:', err);
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// });

// // Login Route
// app.post('/api/login', async (req, res) => {
//     try {
//         const { email, password, role } = req.body;
//         const user = await User.findOne({ email, role });
//         if (!user) return res.status(400).json({ message: 'Invalid credentials' });

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

//         // Generate JWT
//         const token = jwt.sign(
//             { userId: user._id, role: user.role, name: user.name, email: user.email },
//             'your_jwt_secret',
//             { expiresIn: '2h' }
//         );
//         res.json({ message: 'Login successful', token, user: { name: user.name, email: user.email, role: user.role } });
//     } catch (err) {
//         res.status(500).json({ message: 'Server error', error: err.message });
//     }
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));