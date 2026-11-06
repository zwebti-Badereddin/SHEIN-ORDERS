// يوجّه /api/cart إلى قارئ السلة، وكل ما عداه ملفات الموقع الثابتة
import cart from "./netlify/functions/cart.mjs";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/cart") return cart(request);
    return env.ASSETS.fetch(request);
  }
};
