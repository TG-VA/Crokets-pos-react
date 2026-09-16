export const TIME_ZONE = "America/Cancun";

export const formatDate = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-MX", {
    timeZone: TIME_ZONE,
  });
};

export const formatTime = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("es-MX", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateTime = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return `${formatDate(dateValue)} ${formatTime(dateValue)}`;
};
