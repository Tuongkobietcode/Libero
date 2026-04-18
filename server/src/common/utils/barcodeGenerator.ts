function computeLuhnCheckDigit(input: string): number {
  let sum = 0;
  let shouldDouble = true;

  for (let index = input.length - 1; index >= 0; index -= 1) {
    let digit = Number.parseInt(input[index] ?? '0', 10);

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return (10 - (sum % 10)) % 10;
}

function normalizeBookSegment(bookId: string): string {
  return bookId.slice(-6).padStart(6, '0');
}

function toChecksumDigits(segment: string, copySegment: string): string {
  const encodedSegment = segment
    .split('')
    .map((character) => {
      const base36 = Number.parseInt(character.toLowerCase(), 36);
      return Number.isNaN(base36) ? '00' : base36.toString().padStart(2, '0');
    })
    .join('');

  return `${encodedSegment}${copySegment}`;
}

export function generateBarcode(bookId: string, copyIndex: number): string {
  if (!bookId.trim()) {
    throw new Error('bookId is required to generate a barcode');
  }

  if (!Number.isInteger(copyIndex) || copyIndex <= 0) {
    throw new Error('copyIndex must be a positive integer');
  }

  const bookSegment = normalizeBookSegment(bookId);
  const copySegment = copyIndex.toString().padStart(3, '0');
  const luhnDigit = computeLuhnCheckDigit(toChecksumDigits(bookSegment, copySegment));

  return `LIB-${bookSegment}-${copySegment}-${luhnDigit}`;
}
