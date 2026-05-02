export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/contact" || url.pathname === "/contact/") {
      return Response.redirect("https://matejlukasik.com/contact", 302);
    }

    return env.ASSETS.fetch(request);
  },
};
