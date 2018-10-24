import jwt from "jsonwebtoken";

export default userId =>
   jwt.sign({ userId: userId }, process.env.JWT_SECRET, {
      expiresIn: "7 days"
   });
