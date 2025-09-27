const DEFAULT_OFFSET = "+07:00";
const OFFSET_PATTERN = /^([+-])(\d{2}):(\d{2})$/;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const rawEnvOffset = process.env.BOOKING_TZ_OFFSET || process.env.LOCAL_TZ_OFFSET || process.env.TZ_OFFSET || "";
const trimmedOffset = typeof rawEnvOffset === "string" ? rawEnvOffset.trim() : "";
const offsetMatch = OFFSET_PATTERN.exec(trimmedOffset);

const offsetLabel = offsetMatch ? trimmedOffset : DEFAULT_OFFSET;
const sign = offsetMatch ? (offsetMatch[1] === "-" ? -1 : 1) : 1;
const hours = offsetMatch ? Number.parseInt(offsetMatch[2], 10) : 7;
const minutes = offsetMatch ? Number.parseInt(offsetMatch[3], 10) : 0;
const signedOffsetMinutes = sign * (hours * 60 + minutes);

if (!offsetMatch && trimmedOffset) {
  console.warn(
    `[TIMEZONE] Invalid BOOKING_TZ_OFFSET "${trimmedOffset}". Falling back to ${DEFAULT_OFFSET}.`,
  );
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return true;
}

function makeZonedDate(year, month, day, hour = 0, minute = 0) {
  if (!isValidDateParts(year, month, day)) return null;
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const utcMs = Date.UTC(year, month - 1, day, hour, minute);
  return new Date(utcMs - signedOffsetMinutes * 60_000);
}

export function parseBookingDate(dateStr) {
  if (typeof dateStr !== "string") return null;
  const [y, m, d] = dateStr.split("-").map((part) => Number.parseInt(part, 10));
  return makeZonedDate(y, m, d);
}

export function parseBookingDateTime(dateStr, timeStr) {
  if (typeof dateStr !== "string" || typeof timeStr !== "string") return null;
  const date = dateStr.split("-").map((part) => Number.parseInt(part, 10));
  const time = timeStr.split(":").map((part) => Number.parseInt(part, 10));
  if (date.length !== 3 || time.length !== 2) return null;
  return makeZonedDate(date[0], date[1], date[2], time[0], time[1]);
}

export function startOfBookingDay(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const localMs = date.getTime() + signedOffsetMinutes * 60_000;
  const local = new Date(localMs);
  const utcMidnight = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate(),
  );
  return new Date(utcMidnight - signedOffsetMinutes * 60_000);
}

export function addBookingDays(date, amount) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + amount * ONE_DAY_MS);
}

export function isSameBookingDay(a, b) {
  const startA = startOfBookingDay(a);
  const startB = startOfBookingDay(b);
  if (!startA || !startB) return false;
  return startA.getTime() === startB.getTime();
}

export function formatBookingDateInput(value) {
  const start = startOfBookingDay(value);
  if (!start) return "";
  const localMs = start.getTime() + signedOffsetMinutes * 60_000;
  const local = new Date(localMs);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getBookingOffsetMinutes() {
  return signedOffsetMinutes;
}

export function getBookingOffsetLabel() {
  return offsetLabel;
}
