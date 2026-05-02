export class TallyOfflineError extends Error {
  constructor() {
    super("Tally Prime is not running or XML over HTTP is not enabled");
    this.name = "TallyOfflineError";
  }
}

export async function sendTallyRequest(xmlBody: string, tallyUrl = "http://localhost:9000"): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(tallyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=utf-8",
      },
      body: xmlBody,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Tally returned HTTP ${response.status}`);
    }

    return await response.text();
  } catch (err) {
    if (err instanceof Error) {
      if (
        err.message.includes("ECONNREFUSED") ||
        err.message.includes("fetch failed") ||
        err.name === "AbortError" ||
        err.message.includes("ECONNRESET")
      ) {
        throw new TallyOfflineError();
      }
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
