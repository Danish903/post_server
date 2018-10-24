import bcrypt from "bcryptjs";

const hasPassword = password => {
   if (password.length < 6) {
      throw new Error("Passord must be atelast 6 charcters");
   }

   return bcrypt.hash(password, 10);
};
export { hasPassword as default };
