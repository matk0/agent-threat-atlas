const CONTACT_REDIRECT_URL =
  "https://matejlukasik.com/contact?utm_source=agent_threat_atlas&utm_medium=referral&utm_campaign=atlas_funnel&utm_content=contact_redirect";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/contact" || url.pathname === "/contact/") {
      return Response.redirect(CONTACT_REDIRECT_URL, 302);
    }

    const prefix = url.hostname === "atlas.matejlukasik.sk" ? "/sk" : "/en";
    if (!url.pathname.startsWith("/sk/") && !url.pathname.startsWith("/en/")) {
      url.pathname = `${prefix}${url.pathname}`;
    }

    return env.ASSETS.fetch(new Request(url, request));
  },
};
