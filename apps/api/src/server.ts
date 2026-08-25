import { createApp } from "./app";

const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? "0.0.0.0";
const { app } = createApp();

console.log(`EFEX demo API listening at http://${hostname}:${port}`);

export default {
  port,
  hostname,
  fetch: app.fetch,
};
