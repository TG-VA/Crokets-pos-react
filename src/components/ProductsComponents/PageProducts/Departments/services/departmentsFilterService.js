const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const matchesStatus = (dept, status) => {
  if (status === "active") return dept.status !== false;
  if (status === "inactive") return dept.status === false;
  return true;
};

const matchesCommission = (dept, commission) => {
  if (commission === "with") return dept.commission_enabled === true;
  if (commission === "without") return dept.commission_enabled !== true;
  return true;
};

export const filterDepartments = (departments, filters = {}) => {
  if (!Array.isArray(departments)) return [];

  const { search = "", status = "all", commission = "all" } = filters;
  const term = normalizeText(search);

  return departments.filter(
    (dept) =>
      matchesStatus(dept, status) &&
      matchesCommission(dept, commission) &&
      (term === "" || normalizeText(dept.name).includes(term))
  );
};
