import { gql } from "apollo-boost";
export const createUser = gql`
   mutation($data: CreateUserInput!) {
      createUser(data: $data) {
         token
         user {
            id
            name
         }
      }
   }
`;
export const getUsers = gql`
   query {
      users {
         id
         name
         email
      }
   }
`;

export const login = gql`
   mutation($data: LoginUserInput!) {
      login(data: $data) {
         token
      }
   }
`;

export const getProfile = gql`
   query {
      me {
         id
         name
         email
      }
   }
`;
