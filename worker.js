export default {
  async fetch(request, env) {
    const ALLOWED_ORIGIN = 'https://experience-test.elluciancloud.com';

    const getCorsHeaders = () => {
      return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Accept,Content-Type',
        'Vary': 'Origin'
      };
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders()
      });
    }

    if (request.method !== 'GET') {
      return new Response('Only GET is supported', {
        status: 405,
        headers: getCorsHeaders()
      });
    }

    const incomingUrl = new URL(request.url);
    const pathParts = incomingUrl.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2 || pathParts[0] !== 'ethos') {
      return new Response('Use /ethos/<model> or /ethos/<model>/<id>', {
        status: 400,
        headers: getCorsHeaders()
      });
    }

    const modelPath = pathParts.slice(1).join('/');

    const authResp = await fetch('https://integrate.elluciancloud.com/auth', {
      method: 'POST',
      headers: {
        Accept: '*/*',
        Authorization: `Bearer ${env.ethos_app_secret}`,
      },
    });

    if (!authResp.ok) {
      const text = await authResp.text();
      return new Response(`Auth failed: ${text}`, {
        status: authResp.status,
        headers: getCorsHeaders()
      });
    }

    const jwt = (await authResp.text()).trim();

    const ethosUrl = new URL(`https://integrate.elluciancloud.com/api/${modelPath}`);

    ethosUrl.searchParams.set('limit', '1');

    incomingUrl.searchParams.forEach((value, key) => {
      if (key.toLowerCase() !== 'limit') {
        ethosUrl.searchParams.append(key, value);
      }
    });

    const acceptHeader = request.headers.get('accept');

    if (!acceptHeader) {
      return new Response(
        'Missing required Accept header (e.g. application/vnd.hedtech.integration.vX+json)',
        {
          status: 400,
          headers: getCorsHeaders()
        }
      );
    }

    const upstreamResp = await fetch(ethosUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: acceptHeader,
        Authorization: `Bearer ${jwt}`,
      },
    });

    const body = await upstreamResp.text();

    const responseHeaders = new Headers(upstreamResp.headers);

    if (!responseHeaders.get('content-type')) {
      responseHeaders.set('content-type', 'application/json');
    }

    const corsHeaders = getCorsHeaders();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.set(key, value);
    });

    return new Response(body, {
      status: upstreamResp.status,
      headers: responseHeaders
    });
  },
};