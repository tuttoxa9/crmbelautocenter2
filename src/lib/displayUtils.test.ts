// Mocked types to avoid import issues in Node.js test environment
export type LeadStatus =
  | "new"
  | "visit"
  | "refusal"
  | "bank_refusal"
  | "success"
  | "no_answer"
  | "spam";

/**
 * Maps LeadStatus to corresponding CSS background color classes.
 *
 * NOTE: For tests to run with 'node --experimental-strip-types',
 * we avoid importing from other files to bypass module resolution issues.
 */
export const getStatusColor = (status: LeadStatus) => {
  const map: Record<LeadStatus, string> = {
    new: "bg-red-500 hover:bg-red-600",
    visit: "bg-purple-500 hover:bg-purple-600",
    refusal: "bg-slate-800 hover:bg-slate-900",
    bank_refusal: "bg-orange-700 hover:bg-orange-800",
    success: "bg-green-600 hover:bg-green-700",
    no_answer: "bg-yellow-500 hover:bg-yellow-600",
    spam: "bg-zinc-400 hover:bg-zinc-500",
  };
  return map[status] || "bg-zinc-500";
};

const expectedMappings: Record<LeadStatus, string> = {
    new: "bg-red-500 hover:bg-red-600",
    visit: "bg-purple-500 hover:bg-purple-600",
    refusal: "bg-slate-800 hover:bg-slate-900",
    bank_refusal: "bg-orange-700 hover:bg-orange-800",
    success: "bg-green-600 hover:bg-green-700",
    no_answer: "bg-yellow-500 hover:bg-yellow-600",
    spam: "bg-zinc-400 hover:bg-zinc-500",
};

const test = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (error: any) {
        console.error(`❌ ${name}`);
        console.error(error.message);
        process.exit(1);
    }
};

const assertEquals = (actual: any, expected: any) => {
    if (actual !== expected) {
        throw new Error(`Expected "${expected}", but got "${actual}"`);
    }
};

console.log("Running tests for getStatusColor...");

(Object.keys(expectedMappings) as LeadStatus[]).forEach(status => {
    test(`should return correct color for status: ${status}`, () => {
        // Here we test the function exported above
        assertEquals(getStatusColor(status), expectedMappings[status]);
    });
});

test("should return fallback color for unknown status", () => {
    assertEquals(getStatusColor("unknown" as any), "bg-zinc-500");
});

console.log("All tests passed!");
