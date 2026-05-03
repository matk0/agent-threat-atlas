export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/contact" || url.pathname === "/contact/") {
      return Response.redirect("https://matejlukasik.com/contact", 302);
    }

    const prefix = url.hostname === "atlas.matejlukasik.sk" ? "/sk" : "/en";
    if (!url.pathname.startsWith("/sk/") && !url.pathname.startsWith("/en/")) {
      url.pathname = `${prefix}${url.pathname}`;
    }

    return env.ASSETS.fetch(new Request(url, request));
  },
};
