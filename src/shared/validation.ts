export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRequired(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null || value === "") {
    return { valid: false, errors: [`${fieldName} is required`] };
  }
  return { valid: true, errors: [] };
}

export function validateString(value: unknown, fieldName: string, maxLength?: number): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, errors: [`${fieldName} must be a string`] };
  }
  if (maxLength && value.length > maxLength) {
    return { valid: false, errors: [`${fieldName} must not exceed ${maxLength} characters`] };
  }
  return { valid: true, errors: [] };
}

export function validateNumber(value: unknown, fieldName: string, min?: number, max?: number): ValidationResult {
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, errors: [`${fieldName} must be a number`] };
  }
  if (min !== undefined && value < min) {
    return { valid: false, errors: [`${fieldName} must be at least ${min}`] };
  }
  if (max !== undefined && value > max) {
    return { valid: false, errors: [`${fieldName} must not exceed ${max}`] };
  }
  return { valid: true, errors: [] };
}

export function validateEnum(value: unknown, fieldName: string, allowedValues: string[]): ValidationResult {
  if (!allowedValues.includes(value as string)) {
    return { valid: false, errors: [`${fieldName} must be one of: ${allowedValues.join(", ")}`] };
  }
  return { valid: true, errors: [] };
}

export function validateArray(value: unknown, fieldName: string): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, errors: [`${fieldName} must be an array`] };
  }
  return { valid: true, errors: [] };
}

export function combineResults(...results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap(r => r.errors);
  return {
    valid: errors.length === 0,
    errors
  };
}

export function sanitizeString(value: string): string {
  // Remove control characters and limit length
  return value.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 10000);
}

export function validateFilePath(path: string): ValidationResult {
  // Prevent path traversal attacks
  if (path.includes("..") || path.includes("\0")) {
    return { valid: false, errors: ["Invalid file path"] };
  }
  return { valid: true, errors: [] };
}
