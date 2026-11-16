import { getRequestPresentation } from "../lib/server/site-preferences";
import { AppLink } from "./AppLink";

export async function NotFoundContent() {
  const { messages } = await getRequestPresentation();
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      <h1>404 — {messages.notFound.title}</h1>
      <p>{messages.notFound.description}</p>
      <AppLink href="/">{messages.notFound.home}</AppLink>
    </section>
  );
}
