const DEFAULT_PEOPLE_FILTERS = {
  assignee: "all",
  creator: "all",
  customer: "all",
};

function sameValues(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

export function readTaskFilters(params, allStatuses, fallbackStatuses = allStatuses) {
  const rawStatuses = params.get("statuses");
  let statuses;
  if (rawStatuses === null) {
    statuses = [...fallbackStatuses];
  } else if (rawStatuses === "none") {
    statuses = [];
  } else {
    const requested = new Set(rawStatuses.split(","));
    statuses = allStatuses.filter((status) => requested.has(status));
  }

  return {
    q: params.get("q") ?? "",
    view: params.get("view") === "list" ? "list" : "board",
    people: {
      assignee: params.get("assignee") || DEFAULT_PEOPLE_FILTERS.assignee,
      creator: params.get("creator") || DEFAULT_PEOPLE_FILTERS.creator,
      customer: params.get("customer") || DEFAULT_PEOPLE_FILTERS.customer,
    },
    statuses,
  };
}

export function updateTaskFilters(current, patch, allStatuses) {
  const next = new URLSearchParams(current);
  const setOptional = (key, value, defaultValue = "") => {
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
  };

  if (Object.hasOwn(patch, "q")) {
    if (patch.q.trim()) next.set("q", patch.q);
    else next.delete("q");
  }
  if (Object.hasOwn(patch, "view")) setOptional("view", patch.view, "board");
  if (patch.people) {
    Object.entries(patch.people).forEach(([key, value]) => {
      setOptional(key, value, DEFAULT_PEOPLE_FILTERS[key]);
    });
  }
  if (Object.hasOwn(patch, "statuses")) {
    const statuses = allStatuses.filter((status) => patch.statuses.includes(status));
    if (sameValues(statuses, allStatuses)) next.delete("statuses");
    else next.set("statuses", statuses.length ? statuses.join(",") : "none");
  }

  return next;
}
