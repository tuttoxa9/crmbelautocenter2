export const formatPhone = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, "");
  
  // If empty, return "+375 "
  if (digits.length === 0) return "+375 ";

  // Always enforce starting with 375
  let cleanDigits = digits;
  if (!digits.startsWith("375")) {
    if (digits.length === 1 && (digits === "2" || digits === "3" || digits === "4" || digits === "1")) {
      // User typed "2", assume they want to type +375 29
      cleanDigits = "375" + digits;
    } else if (digits === "8029" || digits === "8044" || digits === "8033" || digits === "8025") {
      cleanDigits = "375" + digits.substring(2);
    } else {
       // If they paste a number without 375, add it
       cleanDigits = "375" + digits;
    }
  }

  // Formatting +375 (XX) XXX-XX-XX
  const country = cleanDigits.substring(0, 3);
  const code = cleanDigits.substring(3, 5);
  const part1 = cleanDigits.substring(5, 8);
  const part2 = cleanDigits.substring(8, 10);
  const part3 = cleanDigits.substring(10, 12);

  if (cleanDigits.length <= 3) return `+${country} `;
  if (cleanDigits.length <= 5) return `+${country} ${code}`;
  if (cleanDigits.length <= 8) return `+${country} ${code} ${part1}`;
  if (cleanDigits.length <= 10) return `+${country} ${code} ${part1}-${part2}`;
  
  // Maximum 12 digits (375 + 9)
  return `+${country} ${code} ${part1}-${part2}-${part3.substring(0, 2)}`;
};
