// Cloudflare Pages Function: /api/cart?url=<رابط السلة>
// نفس الدالة المستخدمة على Netlify، فالمنطق في ملف واحد.
import handler from "../../netlify/functions/cart.mjs";
export const onRequest = ({ request }) => handler(request);
