import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js"; // Importing your DB connection


// ----------------------------------------------------
// POST /api/auth/register
// ----------------------------------------------------
export const registerUser= async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    // 1. Validate input
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required." });
    }

    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.users.create({
      data: {
        name,
        email,
        passwordHash, // Matches the schema field
        avatar: avatar || "",
      },
    });

    // 5. Remove passwordHash before sending the response
    const { passwordHash: _, ...safeUser } = newUser;


      

    return res.status(201).json({
      message: "User registered successfully!",
      user: safeUser,
    });
  } catch (error) {
    console.error("Error in register:", error);
    return res
      .status(500)
      .json({ error: "Internal server error during registration." });
  }
};

// ----------------------------------------------------
// POST /api/auth/login
// ----------------------------------------------------

export const login = async(req,res)=>{
      try{

        const {email, password}= req.body;
        if(!email || !password){
            return res.status(400).json({
                error:"Email and password are required"
            });
       }
const user = await prisma.users.findUnique({
  where: { email },
});
     if (!user) {
         return res.status(400).json({
           error: "Invalid creditals",
         });
       }


     const isMatch = await bcrypt.compare(password, user.passwordHash);
     if (!isMatch) {
       return res.status(401).json({ error: "Invalid email or password." });
     }
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "fallback_secret_key",
      { expiresIn: "7d" },
    );
     const { passwordHash: _, ...safeUser } = user;
     res.cookie("token", token);
     return res.status(200).json({
       message: "Login successful!",
       token,
       user: safeUser,
     });
}catch(err){
        console.log(err);
          return res.status(500).json({
            error: "Internal server error during login.",
          });
      }
}
