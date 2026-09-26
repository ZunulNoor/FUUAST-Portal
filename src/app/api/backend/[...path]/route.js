// Same-origin API proxy — the browser only ever talks to this Next.js app.
// The real backend hosts/ports/routes stay server-side and never appear in
// DevTools. Upstream is chosen per request via the `x-backend` header
// (staff | leave | student) set by src/lib/api.js.
//
// Upstream base URLs are SERVER-ONLY env vars (no NEXT_PUBLIC_ prefix):
//   STAFF_API_URL, LEAVE_API_URL, STUDENT_API_URL
const UPSTREAMS = {
  staff: process.env.STAFF_API_URL || 'http://localhost:4002/api',
  leave: process.env.LEAVE_API_URL || 'http://localhost:4003/api',
  student: process.env.STUDENT_API_URL || 'http://localhost:4001/api',
};

async function forward(req, path) {
  const backend = req.headers.get('x-backend') || 'staff';
  const base = (UPSTREAMS[backend] || UPSTREAMS.staff).replace(/\/$/, '');
  const suffix = (path || []).map((segment) => encodeURIComponent(segment)).join('/');
  const incoming = new URL(req.url);
  const target = `${base}/${suffix}${incoming.search}`;

  const headers = new Headers();
  const authorization = req.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  // Preserve the real client IP through the proxy so backend per-IP rate
  // limits (and audit logs) key on the visitor, not on this server.
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length) body = buf;
  }

  let upstream;
  try {
    upstream = await fetch(target, { method: req.method, headers, body });
  } catch {
    return Response.json(
      { error: { message: 'Backend service is unreachable.' } },
      { status: 502 },
    );
  }

  const out = Buffer.from(await upstream.arrayBuffer());
  const outHeaders = new Headers();
  const outContentType = upstream.headers.get('content-type');
  if (outContentType) outHeaders.set('content-type', outContentType);
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) outHeaders.set('content-disposition', disposition);
  // Pass through so the UI can show "try again in …" countdowns on 429s.
  const retryAfter = upstream.headers.get('retry-after');
  if (retryAfter) outHeaders.set('retry-after', retryAfter);
  return new Response(out, { status: upstream.status, headers: outHeaders });
}

export async function GET(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}

export async function POST(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}

export async function PUT(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}

export async function PATCH(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}

export async function DELETE(req, { params }) {
  const { path } = await params;
  return forward(req, path);
}
