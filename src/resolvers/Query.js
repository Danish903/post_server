import { forwardTo } from "prisma-binding";
import getUserId from "../utils/getUserId";

const Query = {
   users(parent, args, { prisma }, info) {
      const opArgs = {
         first: args.first,
         skip: args.skip,
         after: args.after,
         orderBy: args.orderBy
      };
      if (args.query) {
         opArgs.where = {
            // name_contains: args.query,
            OR: [
               {
                  name_contains: args.query
               }
            ]
         };
      }
      return prisma.query.users(opArgs, info);
   },

   userPosts: async (_, args, { prisma, request }, info) => {
      const userId = getUserId(request);
      if (!userId) throw new Error("You're not authenticated");
      const opArgs = {
         first: args.first,
         skip: args.skip,
         after: args.after,
         orderBy: args.orderBy,
         where: { host: { id: userId } }
      };

      return prisma.query.events(opArgs, info);
   },
   me(parent, args, { prisma, request }, info) {
      const userId = getUserId(request);
      if (!userId) return null;
      return prisma.query.user(
         {
            where: {
               id: userId
            }
         },
         info
      );
   },
   events: (_, args, { prisma }, info) => {
      const opArgs = {
         first: args.first,
         skip: args.skip,
         after: !!args.after ? args.after : null,
         orderBy: args.orderBy,
         where: { published: true }
      };
      if (args.query) {
         opArgs.where.OR = [
            {
               title_contains: args.query
            },
            {
               description_contains: args.query
            }
         ];
      }
      return prisma.query.events(opArgs, info);
   },
   eventsConnection: forwardTo("prisma"),

   event: async (_, args, { prisma, request }, info) => {
      const userId = getUserId(request);
      const event = await prisma.query.events(
         {
            where: {
               OR: [
                  { id: args.id, published: true },
                  {
                     id: args.id,
                     host: { id: userId }
                  }
               ]
            }
         },
         info
      );
      if (!event) throw new Error("Photo not found!");
      return event[0];
   },
   getComment: (_, args, { prisma }, info) => {
      const opArgs = {
         first: args.first,
         after: !!args.after ? args.after : null,
         orderBy: args.orderBy,
         where: { event: { id: args.eventId } }
      };
      if (args.query) {
         opArgs.where.OR = [
            {
               title_contains: args.query
            },
            {
               description_contains: args.query
            }
         ];
      }
      return prisma.query.comments(opArgs, info);
   },
   getFavoriteEvent: async (_, { eventId }, { prisma, request }, info) => {
      const userId = getUserId(request, false);
      const events = await prisma.query.favoriteEvents(
         {
            where: {
               event: { id: eventId }
            }
         },
         info
      );
      return events;
   }
};

export { Query as default };
