// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

function parseAmount(val) {
  if (typeof val === "number") {
    return val;
  }
  if (typeof val === "string") {
    return parseFloat(val.replace(/,/g, "").trim());
  }
  return Number(val);
}

const latestEvents = new Map();

const content = fs.readFileSync("payments.jsonl", "utf8");
const lines = content.split("\n");

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) {
    continue;
  }

  let event;
  try {
    event = JSON.parse(trimmed);
  } catch (e) {
    continue;
  }

  if (!event || typeof event !== "object" || !event.txn_id) {
    continue;
  }

  const existing = latestEvents.get(event.txn_id);
  if (!existing || (event.ts && (!existing.ts || event.ts > existing.ts))) {
    latestEvents.set(event.txn_id, event);
  }
}

let total = 0;
let count = 0;

for (const event of latestEvents.values()) {
  if (event.status === "success") {
    try {
      const amount = parseAmount(event.amount);
      if (!isNaN(amount)) {
        total += amount;
        count += 1;
      }
    } catch (e) {
      continue;
    }
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}

