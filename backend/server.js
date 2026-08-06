import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import roomRoutes from './routes/roomRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  
  .catch((error) => console.error('MongoDB connection error:', error));

  
mongoose.connection.once("open", async () => {
  console.log("Connected DB:", mongoose.connection.db.databaseName);

  const count = await mongoose.connection.db
    .collection("rooms")
    .countDocuments();

  console.log("Native Mongo Count:", count);
});
// Routes
app.use('/api', roomRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});