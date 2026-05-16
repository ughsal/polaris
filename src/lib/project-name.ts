export function normalizeProjectName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function makeProjectSuffix() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

export function resolveUniqueProjectName(
  desiredName: string,
  existingNames: Iterable<string>,
) {
  const normalizedName = normalizeProjectName(desiredName);

  if (!normalizedName) {
    return "";
  }

  const takenNames = new Set(existingNames);
  if (!takenNames.has(normalizedName)) {
    return normalizedName;
  }

  let candidate = `${normalizedName}-${makeProjectSuffix()}`;
  while (takenNames.has(candidate)) {
    candidate = `${normalizedName}-${makeProjectSuffix()}`;
  }

  return candidate;
}
