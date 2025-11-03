// index.js
import express from "express";
import { v4 as uuidv4 } from "uuid";
import bypass from "./bypasss.js";

const app = express();
app.use(express.json());

const processStore = new Map();
const AUTO_DELETE_MS = 5 * 60 * 1000; // 5 minutes

function scheduleAutoDelete(id) {
  const entry = processStore.get(id);
  if (!entry) return;
  entry.timerId = setTimeout(() => processStore.delete(id), AUTO_DELETE_MS);
}

// POST /bypass
app.post("/bypass", (req, res) => {
  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") return res.status(400).json({ error: "invalid url" });

  const id = uuidv4();
  const startedAt = Date.now();

  const entry = {
    id,
    urlRequested: url,
    status: "current",
    status_content: `[Forbidden]: Wait response URL take 0s`,
    url: null,
    startedAt,
    timerId: null,
  };

  processStore.set(id, entry);
  scheduleAutoDelete(id);

  (async () => {
    try {
      const result = await bypass(url);
      let resultUrl = null;

      if (typeof result === "string") resultUrl = result;
      else if (result && typeof result === "object" && result.url) resultUrl = result.url;

      if (resultUrl) {
        entry.status = "success";
        entry.status_content = "[Forbidden]: Successfuly bypass Loot Link";
        entry.url = resultUrl;
      } else {
        entry.status = "error";
        entry.status_content = "[Forbidden]: Invalid bypass result";
      }
    } catch (err) {
      entry.status = "error";
      entry.status_content = `[Forbidden]: Bypass error - ${err?.message || "unknown"}`;
    } finally {
      if (entry.timerId) clearTimeout(entry.timerId);
      scheduleAutoDelete(id);
    }
  })();

  return res.status(202).json({ id });
});

// POST /checkProcess
app.post("/checkProcess", (req, res) => {
  const { id } = req.body ?? {};
  if (!id || typeof id !== "string") return res.status(400).json({ error: "invalid id" });

  const entry = processStore.get(id);
  if (!entry) return res.status(404).json({ error: "process not found" });

  if (entry.status === "current") {
    const elapsed = Math.floor((Date.now() - entry.startedAt) / 1000);
    entry.status_content = `[Forbidden]: Wait response URL take ${elapsed}s`;
  }

  const out = {
    id: entry.id,
    status: entry.status,
    status_content: entry.status_content,
  };
  if (entry.status === "success" || entry.url) out.url = entry.url;
  return res.json(out);
});

// GET /
app.get("/", (req, res) => res.send("EEEEEEEEEEERRPR lol"));

// GET /info
app.get("/info", (req, res) =>
  res.json({
    server_name: "Loot Bypass",
    desc: "make by Fioso",
    docs: "hehe",
    note: "ya all is post lol",
  })
);

// 404 for other routes
app.use((req, res) => res.status(404).json({ error: "not found" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
