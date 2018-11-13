import jwt from "jsonwebtoken";
const getUserId = (request, requireAuth = true) => {
   const header = request.request
      ? request.request.headers.authorization
      : request.connection.context.Authorization;

   console.log(header);
   if (header) {
      const token = header.replace("Bearer ", "");

      try {
         const decoded = jwt.verify(token, process.env.JWT_SECRET);
         return decoded.userId;
      } catch (error) {
         console.log(error);
         return null;
      }
   }

   return null;
};

export { getUserId as default };
