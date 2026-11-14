// Process health only: probes must not render pages or depend on Rust/DB health.
export function GET() {
  return new Response("healthy\n", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
