import bcrypt from "bcryptjs";

import getUserId from "../utils/getUserId";
import generateToken from "../utils/generateToken";
import hashPassword from "../utils/hashPassword";

const Mutation = {
   async createUser(parent, args, { prisma }, info) {
      const emailTaken = await prisma.exists.User({ email: args.data.email });
      const password = await hashPassword(args.data.password);
      if (emailTaken) {
         throw new Error("Email taken");
      }
      const user = await prisma.mutation.createUser({
         data: {
            ...args.data,
            password
         }
      });

      return {
         user,
         token: generateToken(user.id)
      };
   },
   login: async (_, { data: { email, password } }, { prisma }, info) => {
      const user = await prisma.query.user({
         where: { email }
      });

      if (!user) {
         throw new Error("User not found");
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw new Error("Invalid password");
      return {
         user,
         token: generateToken(user.id)
      };
   },
   async deleteUser(parent, args, { prisma, request }, info) {
      const userId = getUserId(request);
      return prisma.mutation.deleteUser({
         where: {
            id: userId
         }
      });
   },
   async updateUser(_, args, { prisma, request }, info) {
      const { data } = args;
      const userId = getUserId(request);
      if (typeof data.password === "string") {
         data.password = await hashPassword(data.password);
      }

      return prisma.mutation.updateUser(
         {
            where: {
               id: userId
            },
            data
         },
         info
      );
   },
   // Event Mutation
   createEvent: (_, { data }, { prisma, request }, info) => {
      const userId = getUserId(request);
      return prisma.mutation.createEvent(
         {
            data: {
               ...data,
               host: { connect: { id: userId } }
            }
         },
         info
      );
   },
   likePhoto: async (_, { id }, { prisma, request }, info) => {
      const userId = getUserId(request);

      const event = await prisma.exists.Event({
         id
      });

      if (!event) throw new Error("Photo don't exist to like");
      const exist = await prisma.exists.FavoriteEvent({
         event: { id },
         user: { id: userId }
      });
      if (exist) throw new Error("You already like this post");

      const newFavoriteEvent = await prisma.mutation.createFavoriteEvent(
         {
            data: {
               event: { connect: { id: id } },
               user: { connect: { id: userId } }
            }
         },
         info
      );

      const e = await prisma.query.event({ where: { id } }, `{ likesCount }`);
      await prisma.mutation.updateEvent({
         where: {
            id
         },
         data: {
            likesCount: e.likesCount + 1
         }
      });
      console.log(e);
      return newFavoriteEvent;
   },
   unLikePhoto: async (_, { id, favId }, { prisma, request }, info) => {
      const userId = getUserId(request);

      const exist = await prisma.exists.FavoriteEvent({
         id: favId,
         event: { id },
         user: { id: userId }
      });

      if (!exist) throw new Error("You can't unlike this post");
      const deleteFavEvent = await prisma.mutation.deleteFavoriteEvent(
         {
            where: { id: favId }
         },
         info
      );

      if (Object.keys(deleteFavEvent).length > 0) {
         const e = await prisma.query.event({ where: { id } }, `{likesCount }`);
         await prisma.mutation.updateEvent({
            where: {
               id
            },
            data: {
               likesCount: e.likesCount - 1
            }
         });
      }

      return deleteFavEvent;
   },
   createComment: async (_, { data }, { prisma, request }, info) => {
      const userId = getUserId(request);
      const eventExist = await prisma.exists.Event({
         id: data.eventId,
         published: true
      });

      if (!eventExist) throw new Error("Post don't exist");
      return prisma.mutation.createComment(
         {
            data: {
               text: data.text,
               user: {
                  connect: { id: userId }
               },
               event: {
                  connect: { id: data.eventId }
               }
            }
         },
         info
      );
   },
   deleteComment: async (_, { id }, { prisma, request }, info) => {
      const userId = getUserId(request);
      const commentExist = await prisma.exists.Comment({
         id,
         user: { id: userId }
      });

      if (!commentExist) throw new Error("Comment doesn't exist");
      return prisma.mutation.deleteComment(
         {
            where: { id }
         },
         info
      );
   }
};

export { Mutation as default };
