export const getDatabaseErrorMessage = (error) => {
  return String(error?.message ?? error?.details ?? error?.hint ?? "")
    .trim()
    .toLowerCase();
};

export const isMissingColumnError = (error) => {
  return getDatabaseErrorMessage(error).includes("column");
};

export const isMissingRelationError = (error) => {
  const message = getDatabaseErrorMessage(error);

  return message.includes("relation") || message.includes("does not exist");
};
