export function isStrongPassword(pw) {
  if (typeof pw !== "string") return false;
  const minLength = pw.length >= 8;
  const hasUpper = /[A-Z]/.test(pw);
  const hasLower = /[a-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  return minLength && hasUpper && hasLower && hasNumber;
}

export const PASSWORD_REQUIREMENTS =
  "At least 8 chars, 1 uppercase, 1 lowercase, 1 number";
