const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...jsonHeaders, ...(init.headers || {}) },
  });
}

async function subscriberId(email) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

async function handleNewsletterSubscribe(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }

  let email = "";
  try {
    email = String((await request.json()).email || "").trim().toLowerCase();
  } catch {
    email = "";
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const id = await subscriberId(email);
  let stored = false;

  if (env.SCF_NEWSLETTER_KV) {
    await env.SCF_NEWSLETTER_KV.put(
      `subscriber:${id}`,
      JSON.stringify({ id, createdAt: new Date().toISOString() }),
    );
    stored = true;
  }

  return json({ ok: true, id, stored });
}

async function handleNewsletterStats(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }

  if (!env.SCF_NEWSLETTER_KV) {
    return json({ ok: true, storage: "unbound", count: null, latestCreatedAt: null });
  }

  let cursor;
  let count = 0;
  let latestCreatedAt = null;

  do {
    const page = await env.SCF_NEWSLETTER_KV.list({ prefix: "subscriber:", cursor, limit: 1000 });
    const keys = page.keys || [];
    count += keys.length;

    await Promise.all(keys.map(async (key) => {
      const raw = await env.SCF_NEWSLETTER_KV.get(key.name);
      if (!raw) return;
      try {
        const record = JSON.parse(raw);
        if (record.createdAt && (!latestCreatedAt || record.createdAt > latestCreatedAt)) {
          latestCreatedAt = record.createdAt;
        }
      } catch {
        // Ignore malformed legacy records and keep the aggregate endpoint PII-free.
      }
    }));

    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return json({ ok: true, storage: "kv", count, latestCreatedAt });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/newsletter") {
      return handleNewsletterSubscribe(request, env);
    }

    if (url.pathname === "/api/newsletter/stats") {
      return handleNewsletterStats(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
