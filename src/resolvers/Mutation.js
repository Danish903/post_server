import bcrypt from "bcryptjs";
import { createWriteStream } from "fs";
import shortid from "shortid";
import getUserId from "../utils/getUserId";
import generateToken from "../utils/generateToken";
import hashPassword from "../utils/hashPassword";
import cloudinary from "cloudinary";
import lowdb from "lowdb";
import * as mkdirp from "mkdirp";
const FileSync = require("lowdb/adapters/FileSync");

const uploadDir = "./uploads";
const db = new lowdb(new FileSync("db.json"));
cloudinary.config({
   cloud_name: "dluo0wvst",
   api_key: process.env.CLOUDINARY_API_KEY,
   api_secret: process.env.CLOUDINARY_API_SECRET
});

db.defaults({ uploads: [] }).write();

mkdirp.sync(uploadDir);

const storeUpload = async ({ stream, filename }) => {
   const id = shortid.generate();
   const path = `images/${id}-${filename}`;

   return new Promise((resolve, reject) =>
      stream
         .pipe(createWriteStream(path))
         .on("finish", () => resolve({ id, path }))
         .on("error", reject)
   );
};

const processUpload = async upload => {
   const { stream, filename, mimetype, encoding } = await upload;
   const { id, path } = await storeUpload({ stream, filename });
   let res_promise = new Promise((resolve, reject) => {
      cloudinary.v2.uploader.upload(
         path,
         { public_id: `photoups/${id}` },
         function(error, result) {
            if (error) {
               reject(error);
            } else {
               resolve(result);
            }
         }
      );
   });
   return res_promise;
};
const Mutation = {
   singleUpload: async (
      parent,
      { data: { file, ...rest } },
      { prisma, request },
      info
   ) => {
      const userId = getUserId(request);

      if (!userId) throw new Error("You're not authenticated");
      let pic = null;
      try {
         pic = await processUpload(file);
      } catch (error) {
         throw new Error("Image couldn't uploaded");
      }

      const newPost = await prisma.mutation.createEvent(
         {
            data: {
               ...rest,
               imageURL: pic.secure_url,
               imageURL_ID: pic.public_id,
               host: { connect: { id: userId } }
            }
         },
         info
      );

      return {
         success: true
      };
   },
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
   createEvent: async (
      _,
      { data: { image, ...rest } },
      { prisma, request },
      info
   ) => {
      const userId = getUserId(request);
      const pictureURL = await processUpload(image);
      // console.log(pictureURL);
      return pictureURL;
      // if (!userId) throw new Error("You're not authenticated!");
      // return prisma.mutation.createEvent(
      //    {
      //       data: {
      //          ...rest,
      //          host: { connect: { id: userId } }
      //       }
      //    },
      //    info
      // );
   },
   deletePost: async (_, { id, img_ID }, { prisma, request }, info) => {
      const userId = getUserId(request);
      if (!userId)
         throw new Error("You're not authenticated to delete this post");
      const exists = await prisma.exists.Event({
         id,
         host: { id: userId }
      });
      if (!exists) throw new Error("You can't delete this post!");

      cloudinary.v2.uploader.destroy(img_ID, function(error, result) {
         console.log(result, error);
      });
      return prisma.mutation.deleteEvent(
         {
            where: {
               id
            }
         },
         info
      );
   },
   likePhoto: async (_, { id }, { prisma, request }, info) => {
      const userId = getUserId(request);
      if (!userId) throw new Error("You're not authenticated");
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
      if (!userId)
         throw new Error("Please Signup or login to create a comment");
      const eventExist = await prisma.exists.Event({
         id: data.eventId,
         published: true,
         disableComment: false
      });

      if (!eventExist)
         throw new Error(
            "Either post don't exist or comment is disable for this post"
         );
      const newComment = await prisma.mutation.createComment(
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

      if (Object.keys(newComment).length > 0) {
         const e = await prisma.query.event(
            { where: { id: data.eventId } },
            `{commentCount}`
         );
         await prisma.mutation.updateEvent({
            where: {
               id: data.eventId
            },
            data: {
               commentCount: e.commentCount + 1
            }
         });
      }
      return newComment;
   },
   deleteComment: async (_, { id, eventId }, { prisma, request }, info) => {
      const userId = getUserId(request);
      if (!userId) throw new Error("You're not authenticated");
      const commentExist = await prisma.exists.Comment({
         id,
         user: { id: userId }
      });
      const isOwner = await prisma.exists.Event({
         id: eventId,
         host: { id: userId }
      });
      if (commentExist || isOwner) {
         const deletedComment = await prisma.mutation.deleteComment(
            {
               where: { id }
            },
            info
         );
         if (Object.keys(deletedComment).length > 0) {
            const e = await prisma.query.event(
               { where: { id: eventId } },
               `{commentCount}`
            );
            await prisma.mutation.updateEvent({
               where: {
                  id: eventId
               },
               data: {
                  commentCount: e.commentCount - 1
               }
            });
         }
         return deletedComment;
      }

      throw new Error("Comment Unable to delete or comment don't  exist");
   },
   updateComment: async (_, { id, data }, { prisma, request }, info) => {
      const userId = getUserId(request);

      if (!userId) throw new Error("You are not authenticated");
      const exists = await prisma.exists.Comment({
         id,
         user: { id: userId }
      });
      if (!exists) throw new Error("Unable to update comment");
      return prisma.mutation.updateComment(
         {
            where: { id },
            data
         },
         info
      );
   },
   updateEvent: async (_, { id, data }, { prisma, request }, info) => {
      const userId = getUserId(request);

      if (!userId) throw new Error("You are not authenticated");
      const exists = await prisma.exists.Event({
         id,
         host: { id: userId }
      });
      if (!exists) throw new Error("Unable to update comment");
      return prisma.mutation.updateEvent(
         {
            where: { id },
            data
         },
         info
      );
   }
};

export { Mutation as default };
