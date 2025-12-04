import express from "express";
import methodOverride from 'method-override';
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import session from "express-session";
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import flash from "connect-flash";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: 'smart-floor',
  saveUninitialized: false,
  resave: false
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(methodOverride('_method'));

app.use("/", userRoutes);
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});