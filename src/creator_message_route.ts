import { createServer } from "node:http";
import { ZodError } from "zod";
import { deliveryRequest, sendCreatorAsset } from "./creator_delivery.js";
import { InfraiError } from "./infrai.js";

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/creator-asset-deliveries") {
    response.writeHead(404).end();
    return;
  }

  let body = "";
  for await (const chunk of request) body += chunk;
  try {
    const result = await sendCreatorAsset(deliveryRequest.parse(JSON.parse(body)));
    response.writeHead(201, { "Content-Type": "application/json" }).end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof ZodError ? 400 : error instanceof InfraiError ? error.status : 502;
    response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify({ error: (error as Error).message }));
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => {
  console.log("Creator delivery route listening on http://localhost:3000/creator-asset-deliveries");
});
