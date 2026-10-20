import assert from "node:assert/strict";
import test from "node:test";
import { readTaskFilters, updateTaskFilters } from "./urlFilters.js";

const statuses = ["todo", "in_progress", "done"];

test("reads task filters from the query string", () => {
  const filters = readTaskFilters(
    new URLSearchParams("q=alpha&view=list&assignee=user-1&creator=none&customer=user-2&statuses=done,todo,unknown,done"),
    statuses,
  );

  assert.deepEqual(filters, {
    q: "alpha",
    view: "list",
    people: { assignee: "user-1", creator: "none", customer: "user-2" },
    statuses: ["todo", "done"],
  });
});

test("uses stored statuses only when the URL does not contain a status filter", () => {
  assert.deepEqual(
    readTaskFilters(new URLSearchParams(), statuses, ["done"]).statuses,
    ["done"],
  );
  assert.deepEqual(
    readTaskFilters(new URLSearchParams("statuses=none"), statuses, ["done"]).statuses,
    [],
  );
});

test("updates filters while preserving unrelated query parameters", () => {
  const updated = updateTaskFilters(
    new URLSearchParams("projects=p1&assignee=old&view=list"),
    { q: "  report  ", view: "board", people: { assignee: "all" } },
    statuses,
  );

  assert.equal(updated.get("projects"), "p1");
  assert.equal(updated.get("q"), "  report  ");
  assert.equal(updated.has("view"), false);
  assert.equal(updated.has("assignee"), false);
});

test("serializes selected, empty and default status sets", () => {
  assert.equal(
    updateTaskFilters(new URLSearchParams(), { statuses: ["done", "todo"] }, statuses).get("statuses"),
    "todo,done",
  );
  assert.equal(
    updateTaskFilters(new URLSearchParams(), { statuses: [] }, statuses).get("statuses"),
    "none",
  );
  assert.equal(
    updateTaskFilters(new URLSearchParams("statuses=done"), { statuses }, statuses).has("statuses"),
    false,
  );
});
