function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function toLocalDateTimeInput(value: string | Date) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeToUtcInput(value: string) {
  const date = new Date(value);
  return isNaN(+date) ? value : date.toISOString().slice(0, 16);
}

export function normalizeScheduleForm(event: SubmitEvent) {
  const form = event.currentTarget as HTMLFormElement;
  for (const name of ['startsAt', 'endsAt']) {
    const input = form.elements.namedItem(name);
    if (input instanceof HTMLInputElement) input.value = localDateTimeToUtcInput(input.value);
  }
}
