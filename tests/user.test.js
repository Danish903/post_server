import "cross-fetch/polyfill";

import prisma from "../src/prisma";
import seedDatabase, { userOne } from "./utils/seedDatabase";

import getClient from "./utils/getClient";
import { createUser, getProfile, getUsers, login } from "./utils/operation";

const client = getClient();

beforeEach(seedDatabase);

describe(
   "User",
   () => {
      test(
         "Should create a new user",
         async () => {
            const variables = {
               data: {
                  name: "test",
                  email: "e@example.com",
                  password: "password"
               }
            };

            const response = await client.mutate({
               mutation: createUser,
               variables
            });

            const userExists = prisma.exists.User({
               id: response.data.createUser.user.id
            });

            expect(response.data.createUser.user.name).toBe("test");
            expect(userExists).toBeTruthy();
         },
         30000
      );

      test(
         "Should not login with bad credentials",
         async () => {
            const variables = {
               data: {
                  email: "Buster@getMaxListeners.com",
                  password: "password123"
               }
            };

            await expect(
               client.mutate({
                  mutation: login,
                  variables
               })
            ).rejects.toThrow();
         },
         30000
      );

      test(
         "shouldn't create a user with short password ",
         async () => {
            const variables = {
               data: {
                  name: "buster123",
                  email: "123!@gmail.com",
                  password: "pass"
               }
            };
            await expect(
               client.mutate({
                  mutation: createUser,
                  variables
               })
            ).rejects.toThrow();
         },
         30000
      );
      test(
         "should expose public author profiles",
         async () => {
            const response = await client.query({
               query: getUsers
            });
            expect(response.data.users.length).toBe(2);
            expect(response.data.users[0].email).toBe(null);
            expect(response.data.users[0].name).toBe("Buster");
         },
         30000
      );

      test(
         "should fetch user profile",
         async () => {
            const client = getClient(userOne.jwt);
            const { data } = await client.query({
               query: getProfile
            });
            expect(data.me.id).toBe(userOne.user.id);
            expect(data.me.name).toBe(userOne.user.name);
            expect(data.me.email).toBe(userOne.user.email);
         },
         30000
      );
   },
   30000
);
