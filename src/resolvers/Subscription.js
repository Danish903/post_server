import getUserId from "../utils/getUserId";

// import getUserId from "../utils/getUserId";

const Subscription = {
   favoriteEvent: {
      subscribe: (_, { eventId }, { prisma }, info) => {
         return prisma.subscription.favoriteEvent(
            {
               where: {
                  node: {
                     event: { id: eventId }
                  }
               }
            },
            info
         );
      }
   },
   event: {
      subscribe: (_, args, { prisma, pubsub }, info) => {
         return prisma.subscription.event(
            {
               where: {
                  node: {
                     published: true
                  }
               }
            },
            info
         );
      }
   },
   singleEvent: {
      subscribe: (_, { id }, { prisma }, info) => {
         return prisma.subscription.event(
            {
               where: {
                  node: {
                     AND: [
                        {
                           published: true
                        },
                        {
                           id
                        }
                     ]
                  }
               }
            },
            info
         );
      }
   },
   userPost: {
      subscribe: (_, args, { prisma, request }, info) => {
         const userId = getUserId(request);
         return prisma.subscription.event(
            {
               where: {
                  node: {
                     host: { id: userId }
                  }
               }
            },
            info
         );
      }
   },
   comment: {
      subscribe: (_, { eventId }, { prisma }, info) => {
         return prisma.subscription.comment(
            {
               where: {
                  node: {
                     event: {
                        id: eventId
                     }
                  }
               }
            },
            info
         );
      }
   }
};

export default Subscription;
