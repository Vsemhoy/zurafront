export function filterContractors(contractors, { type = 'all', search = '', departmentId = '', departments = [] } = {}) {
  const members = departmentId
    ? new Set(departments.find((department) => department.id === departmentId)?.members?.map((member) => member.user_id) ?? [])
    : null;
  const query = search.trim().toLowerCase();
  return contractors.filter((contractor) =>
    (type === 'all' || contractor.type === type) &&
    (!members || members.has(contractor.id)) &&
    `${contractor.name} ${contractor.email ?? ''} ${contractor.username ?? ''}`.toLowerCase().includes(query));
}
