import getUserId from "../utils/getUserId";

const Query = {
   users(parent, args, { db, prisma }, info) {
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

   me(parent, args, { prisma, request }, info) {
      const userId = getUserId(request);

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
         after: args.after,
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
   event: async (_, args, { prisma }, info) => {
      const event = await prisma.query.event(
         {
            where: { id: args.id }
         },
         info
      );
      if (!event) throw new Error("Photo not found!");
      return event;
   },
   getComment: (_, { eventId, orderBy }, { prisma }, info) => {
      return prisma.query.comments(
         {
            where: {
               event: { id: eventId }
            },
            orderBy
         },
         info
      );
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
