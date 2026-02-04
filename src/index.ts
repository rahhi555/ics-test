import { Hono } from "hono";
import html from "../index.html";

const app = new Hono();

app.get("/", (c) => {
  return c.html(html);
});

// ICS用のエスケープ処理
function escapeICS(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

// 日付をICS形式に変換（YYYYMMDD）
function formatDateForICS(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

// UIDを生成
function generateUID(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2) + "@ics-generator";
}

// ICSファイル生成エンドポイント
app.get("/generate-ics", (c) => {
  const query = c.req.query();

  const summary = query.summary || "宿泊予約";
  const dtstart = query.dtstart;
  const dtend = query.dtend;
  const location = query.location;
  const description = query.description;
  const url = query.url;

  if (!dtstart || !dtend) {
    return c.text("チェックイン日とチェックアウト日は必須です", 400);
  }

  // DTSTAMP用の現在日時を生成
  const now = new Date();
  const dtstamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

  const icsContent: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ICS Generator//JP",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${generateUID()}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DTSTART;VALUE=DATE:${formatDateForICS(dtstart)}`,
    `DTEND;VALUE=DATE:${formatDateForICS(dtend)}`,
  ];

  if (location) {
    icsContent.push(`LOCATION:${escapeICS(location)}`);
  }

  if (description) {
    icsContent.push(`DESCRIPTION:${escapeICS(description)}`);
  }

  if (url) {
    icsContent.push(`URL:${url}`);
  }

  icsContent.push("STATUS:CONFIRMED");
  icsContent.push("SEQUENCE:0");
  icsContent.push("END:VEVENT");
  icsContent.push("END:VCALENDAR");

  const icsString = icsContent.join("\r\n");

  // Content-Disposition付きでICSファイルを返す
  return c.body(icsString, 200, {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": 'attachment; filename="reservation.ics"',
  });
});

export default app;
