import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import prisma from "../../src/prisma";

const userOne = {
   input: {
      name: "Buster",
      email: "Buster@gmail.com",
      password: bcrypt.hashSync("password", 10)
   },
   user: undefined,
   jwt: undefined
};
const userTwo = {
   input: {
      name: "Pinky",
      email: "pinky@gmail.com",
      password: bcrypt.hashSync("password", 10)
   },
   user: undefined,
   jwt: undefined
};

const seedDatabase = async () => {
   await prisma.mutation.deleteManyUsers();
   userOne.user = await prisma.mutation.createUser({
      data: userOne.input
   });
   const { user } = userOne;
   userOne.jwt = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

   userTwo.user = await prisma.mutation.createUser({
      data: userTwo.input
   });

   userTwo.jwt = jwt.sign({ userId: userTwo.user.id }, process.env.JWT_SECRET);
};

export { seedDatabase as default, userOne, userTwo };
