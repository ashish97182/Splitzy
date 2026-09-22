
import express from "express";

const app = express();

const PORT = 5001;

// Middleware
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

