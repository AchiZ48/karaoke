export const TIME_SLOTS = [
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
  "20:00-22:00",
];

export function getCurrentTimeSlot(now = new Date(), slots = TIME_SLOTS) {
  if (!now || !slots || !Array.isArray(slots) || slots.length === 0) {
    return null;
  }
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (const slot of slots) {
    if (!slot || typeof slot !== "string" || !slot.includes("-")) continue;
    const [start, end] = slot.split("-");
    if (!start || !end) continue;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (
      Number.isFinite(sh) &&
      Number.isFinite(sm) &&
      Number.isFinite(eh) &&
      Number.isFinite(em)
    ) {
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      if (minutes >= startMinutes && minutes < endMinutes) {
        return slot;
      }
    }
  }
  return null;
}

