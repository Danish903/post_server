import "@babel/polyfill/noConflict";
import server from "./server";

const options = {
   // cors: {
   //    origin: process.env.ORIGIN,
   //    credentials: true
   // },
   port: process.env.PORT || 8888
};

server.start(options, () => {
   console.log("The server is up at 8888!");
});
