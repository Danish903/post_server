import { extractFragmentReplacements } from "prisma-binding";
import Query from "./Query";
import Mutation from "./Mutation";
import User from "./User";
import Subscription from "./Subscription";

const resolvers = {
   Query,
   Mutation,
   Subscription,
   User
};

const fragmentReplacements = extractFragmentReplacements(resolvers);

export { resolvers, fragmentReplacements };
