/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env) {
    // Helper: compute CORS headers based on request origin
    const getCorsHeaders = (origin) => {
      const allowOrigin = origin || '*';
      return {
        'Access-Control-Allow-Origin': allowOrigin,
        // allow these methods (we only need GET for your flow, but include OPTIONS for preflight)
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        // allow sending Accept header (and others if you add them client-side)
        'Access-Control-Allow-Headers': 'Accept,Content-Type',
        // no cookies/credentials expected — do not set Access-Control-Allow-Credentials unless needed
        'Vary': 'Origin'
      };
    };

    // Only allow GET (but we must handle OPTIONS preflight too)
    if (request.method === 'OPTIONS') {
      // Handle preflight: reply with CORS headers only
      const origin = request.headers.get('Origin');
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(origin)
      });
    }

    if (request.method !== 'GET') {
      const origin = request.headers.get('Origin');
      return new Response('Only GET is supported', {
        status: 405,
        headers: getCorsHeaders(origin)
      });
    }

    const incomingUrl = new URL(request.url);

    // Expect: /ethos/<model> or /ethos/<model>/<id>
    const pathParts = incomingUrl.pathname.split("/").filter(Boolean);

    if (pathParts.length < 2 || pathParts[0] !== "ethos") {
      const origin = request.headers.get('Origin');
      return new Response("Use /ethos/<model> or /ethos/<model>/<id>", {
        status: 400,
        headers: getCorsHeaders(origin)
      });
    }

    // Everything after /ethos is forwarded as-is
    const modelPath = pathParts.slice(1).join("/");

    // --- 1) Get JWT ---
    const authResp = await fetch("https://integrate.elluciancloud.com/auth", {
      method: "POST",
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${env.ethos_app_secret}`,
      },
    });

    const origin = request.headers.get('Origin'); // note origin for final response

    if (!authResp.ok) {
      const text = await authResp.text();
      return new Response(`Auth failed: ${text}`, {
        status: authResp.status,
        headers: getCorsHeaders(origin)
      });
    }

    const jwt = (await authResp.text()).trim();

    // --- 2) Build Ethos URL ---
    const ethosUrl = new URL(
      `https://integrate.elluciancloud.com/api/${modelPath}`
    );

    // 🔒 Hardcode limit=1 for simple flow
    ethosUrl.searchParams.set("limit", "1");

    // Forward all other query params (except limit)
    incomingUrl.searchParams.forEach((value, key) => {
      if (key.toLowerCase() !== 'limit') {
        ethosUrl.searchParams.append(key, value);
      }
    });

    // --- 3) Call Ethos ---
    const acceptHeader = request.headers.get("accept");

    if (!acceptHeader) {
      return new Response(
        "Missing required Accept header (e.g. application/vnd.hedtech.integration.vX+json)",
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    const upstreamResp = await fetch(ethosUrl.toString(), {
      method: "GET",
      headers: {
        Accept: acceptHeader,
        Authorization: `Bearer ${jwt}`,
      },
    });

    const body = await upstreamResp.text();

    // --- 4) Return response with CORS headers ---
    // Copy upstream content-type if present, and append CORS headers
    const responseHeaders = new Headers(upstreamResp.headers);
    // Ensure content-type present (fallback)
    if (!responseHeaders.get('content-type')) {
      responseHeaders.set('content-type', 'application/json');
    }

    // Add/overwrite CORS headers
    const corsHeaders = getCorsHeaders(origin);
    Object.entries(corsHeaders).forEach(([k, v]) => responseHeaders.set(k, v));

    return new Response(body, {
      status: upstreamResp.status,
      headers: responseHeaders
    });
  },
};


