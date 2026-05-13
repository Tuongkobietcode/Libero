type ClassValue = string | number | false | null | undefined;

export function cn(...inputs: Array<ClassValue | ClassValue[]>): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const inner = cn(...input);
      if (inner) classes.push(inner);
    } else {
      classes.push(String(input));
    }
  }
  return classes.join(' ');
}
