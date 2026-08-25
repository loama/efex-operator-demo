/// <reference types="bun" />

const distDirectory = new URL("../dist/", import.meta.url);

Bun.serve({
  port: Number(process.env.PORT ?? 4173),
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    const directFile = Bun.file(new URL(relativePath, distDirectory));

    if (await directFile.exists()) return new Response(directFile);

    const routeFile = Bun.file(new URL(`${relativePath}.html`, distDirectory));
    if (await routeFile.exists()) return new Response(routeFile);

    return new Response("Not found", { status: 404 });
  },
});
