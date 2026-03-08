import { parseReceiptText } from "../server/routes";

// ── Simple test runner ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
    );
  }
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err: any) {
    failed++;
    const msg = `  FAIL  ${name}\n        ${err.message}`;
    console.log(msg);
    failures.push(msg);
  }
}

function describe(suite: string, fn: () => void): void {
  console.log(`\n${suite}`);
  fn();
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("1. Standard receipt - items with prices at end of line", () => {
  test("parses single item with dollar sign", () => {
    const result = parseReceiptText("Burger $12.99");
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].name, "Burger", "item name");
    assertEqual(result.lineItems[0].price, 12.99, "item price");
  });

  test("parses multiple items with prices", () => {
    const text = [
      "Burger $12.99",
      "Fries $4.50",
      "Soda $2.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 3, "item count");
    assertEqual(result.lineItems[0].name, "Burger", "first item name");
    assertEqual(result.lineItems[1].name, "Fries", "second item name");
    assertEqual(result.lineItems[2].name, "Soda", "third item name");
    assertEqual(result.lineItems[0].price, 12.99, "first item price");
    assertEqual(result.lineItems[1].price, 4.50, "second item price");
    assertEqual(result.lineItems[2].price, 2.00, "third item price");
  });

  test("parses items without dollar sign", () => {
    const result = parseReceiptText("Steak 24.99");
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].price, 24.99, "price without $");
  });
});

describe("2. Price on next line - item name then price below", () => {
  test("parses item name on one line and price on the next", () => {
    const text = [
      "Grilled Chicken",
      "15.99",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].name, "Grilled Chicken", "item name");
    assertEqual(result.lineItems[0].price, 15.99, "item price");
  });

  test("parses multiple items with prices on next lines", () => {
    const text = [
      "Caesar Salad",
      "11.50",
      "Iced Tea",
      "3.25",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 2, "item count");
    assertEqual(result.lineItems[0].name, "Caesar Salad", "first name");
    assertEqual(result.lineItems[1].name, "Iced Tea", "second name");
    assertEqual(result.lineItems[0].price, 11.50, "first price");
    assertEqual(result.lineItems[1].price, 3.25, "second price");
  });

  test("parses price with dollar sign on next line", () => {
    const text = [
      "Fish Tacos",
      "$14.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].price, 14.00, "price");
  });
});

describe("3. Summary extraction - subtotal, tax, total", () => {
  test("extracts subtotal, tax, and total from end-of-line prices", () => {
    const text = [
      "Pasta $15.00",
      "Subtotal $15.00",
      "Tax $1.20",
      "Total $16.20",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.subtotal, 15.00, "subtotal");
    assertEqual(result.tax, 1.20, "tax");
    assertEqual(result.total, 16.20, "total");
    assertEqual(result.lineItems.length, 1, "items should not include summary lines");
  });

  test("extracts sub-total with hyphen", () => {
    const text = [
      "Burger $10.00",
      "Sub-Total $10.00",
      "Tax $0.80",
      "Total $10.80",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.subtotal, 10.00, "subtotal with hyphen");
  });

  test("extracts amount due as total", () => {
    const text = [
      "Salad $9.00",
      "Amount Due $9.72",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.total, 9.72, "amount due as total");
  });

  test("extracts balance due as total", () => {
    const text = [
      "Pizza $18.00",
      "Balance Due $19.44",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.total, 19.44, "balance due as total");
  });

  test("extracts HST as tax", () => {
    const text = [
      "Wings $12.00",
      "HST $1.56",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.tax, 1.56, "HST as tax");
  });

  test("extracts GST as tax", () => {
    const text = [
      "Coffee $5.00",
      "GST $0.25",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.tax, 0.25, "GST as tax");
  });
});

describe("4. Merchant name detection", () => {
  test("detects first capitalized line as merchant name", () => {
    const text = [
      "Joe's Diner",
      "Burger $12.99",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.merchantName, "Joe's Diner", "merchant name");
  });

  test("skips noise lines for merchant detection", () => {
    const text = [
      "Thank you for visiting",
      "The Good Place",
      "Salad $8.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.merchantName, "The Good Place", "merchant after noise");
  });

  test("does not use summary labels as merchant", () => {
    const text = [
      "Total",
      "$20.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.merchantName, "Unknown", "should not use Total as merchant");
  });

  test("returns Unknown when no merchant is detectable", () => {
    const result = parseReceiptText("$5.00");
    assertEqual(result.merchantName, "Unknown", "no merchant for price-only");
  });

  test("lowercase first line is not merchant", () => {
    const text = [
      "some random note",
      "Big Restaurant",
      "Steak $30.00",
    ].join("\n");
    const result = parseReceiptText(text);
    // lowercase line won't match /^[A-Z]/ so Big Restaurant should be merchant
    assertEqual(result.merchantName, "Big Restaurant", "lowercase skipped");
  });
});

describe("5. Noise filtering", () => {
  test("filters date lines", () => {
    const text = [
      "03/08/2026",
      "Cafe Latte $5.50",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "date filtered");
    assertEqual(result.lineItems[0].name, "Cafe Latte", "correct item after date");
  });

  test("filters phone/tel lines", () => {
    const text = [
      "Tel: 555-1234",
      "Muffin $3.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "phone filtered");
  });

  test("filters thank you lines", () => {
    const text = [
      "Pancakes $8.00",
      "Thank you for dining with us!",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "thank you filtered");
  });

  test("filters URL lines", () => {
    const text = [
      "www.restaurant.com",
      "Soup $6.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "URL filtered");
  });

  test("filters http lines", () => {
    const text = [
      "http://receipt.example.com/abc",
      "Sandwich $7.50",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "http filtered");
  });

  test("filters card/visa/debit lines", () => {
    const text = [
      "Visa ending 1234",
      "Wrap $9.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "card info filtered");
  });

  test("filters dashed separator lines", () => {
    const text = [
      "-----",
      "Juice $4.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "separator filtered");
  });

  test("filters asterisk separator lines", () => {
    const text = [
      "****",
      "Pie $5.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "asterisk separator filtered");
  });

  test("filters equals separator lines", () => {
    const text = [
      "====",
      "Cookie $2.50",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "equals separator filtered");
  });

  test("filters time lines", () => {
    const text = [
      "14:30",
      "Latte $4.50",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "time line filtered");
  });

  test("filters order/check/table/server lines", () => {
    const text = [
      "Order #1234",
      "Check 5678",
      "Table 12",
      "Server: Jane",
      "Nachos $11.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "service info filtered");
  });

  test("filters please come again", () => {
    const text = [
      "Bagel $3.50",
      "Please come again!",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "please come again filtered");
  });
});

describe("6. Quantity prefixes", () => {
  test("strips 2x prefix from item name", () => {
    const result = parseReceiptText("2x Burger $12.99");
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].name, "Burger", "2x stripped");
  });

  test("strips 3X (uppercase) prefix", () => {
    const result = parseReceiptText("3X Fries $4.50");
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].name, "Fries", "3X stripped");
  });

  test("strips quantity with @ sign", () => {
    const result = parseReceiptText("2@ Soda $2.00");
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].name, "Soda", "2@ stripped");
  });

  test("strips quantity prefix on next-line price format", () => {
    const text = [
      "2x Wings",
      "12.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].name, "Wings", "2x stripped in next-line format");
  });
});

describe("7. Tip handling", () => {
  test("skips tip line with price at end", () => {
    const text = [
      "Steak $25.00",
      "Tip $5.00",
      "Total $30.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "tip not in items");
    assertEqual(result.lineItems[0].name, "Steak", "item is Steak");
    assertEqual(result.total, 30.00, "total correct");
  });

  test("skips gratuity line", () => {
    const text = [
      "Salmon $20.00",
      "Gratuity $4.00",
      "Total $24.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "gratuity not in items");
    assertEqual(result.total, 24.00, "total correct");
  });

  test("skips tip with price on next line", () => {
    const text = [
      "Tacos $10.00",
      "Tip",
      "$2.00",
      "Total $12.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "tip not in items (next-line)");
  });
});

describe("8. Discount lines", () => {
  test("filters discount line", () => {
    const text = [
      "Burger $12.00",
      "Discount -$2.00",
      "Total $10.00",
    ].join("\n");
    const result = parseReceiptText(text);
    // Discount is filtered by isNoiseLine
    assertEqual(result.lineItems.length, 1, "discount not in items");
    assertEqual(result.lineItems[0].name, "Burger", "only burger in items");
  });

  test("filters coupon line", () => {
    const text = [
      "Pasta $14.00",
      "Coupon Applied -$3.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "coupon not in items");
  });

  test("filters promo line", () => {
    const text = [
      "Pizza $18.00",
      "Promo: SAVE10 -$1.80",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "promo not in items");
  });

  test("filters savings line", () => {
    const text = [
      "Salad $9.00",
      "Savings $1.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "savings not in items");
  });
});

describe("9. Empty input", () => {
  test("returns defaults for empty string", () => {
    const result = parseReceiptText("");
    assertEqual(result.merchantName, "Unknown", "default merchant");
    assertEqual(result.lineItems.length, 0, "no items");
    assertEqual(result.subtotal, null, "null subtotal");
    assertEqual(result.tax, null, "null tax");
    assertEqual(result.total, null, "null total");
  });

  test("returns defaults for whitespace-only string", () => {
    const result = parseReceiptText("   \n\n   \n");
    assertEqual(result.merchantName, "Unknown", "default merchant");
    assertEqual(result.lineItems.length, 0, "no items");
  });
});

describe("10. Edge cases", () => {
  test("handles comma as decimal separator", () => {
    const result = parseReceiptText("Espresso $3,50");
    assertEqual(result.lineItems.length, 1, "item count");
    assertEqual(result.lineItems[0].price, 3.50, "comma decimal");
  });

  test("handles price-only line (no item name)", () => {
    const result = parseReceiptText("$5.00");
    assertEqual(result.lineItems.length, 0, "price-only should not create item");
  });

  test("handles very long item name", () => {
    const longName = "A".repeat(100);
    const result = parseReceiptText(`${longName} $10.00`);
    assertEqual(result.lineItems.length, 1, "long name item count");
    assertEqual(result.lineItems[0].name, longName, "long name preserved");
  });

  test("skips items with zero price", () => {
    const result = parseReceiptText("Free Water $0.00");
    // price <= 0 is skipped
    assertEqual(result.lineItems.length, 0, "zero price skipped");
  });

  test("skips lines that are just numbers", () => {
    const text = [
      "12345",
      "Burger $10.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.lineItems.length, 1, "number-only line skipped");
  });

  test("handles single character lines (too short for item)", () => {
    const text = [
      "A",
      "Burger $10.00",
    ].join("\n");
    const result = parseReceiptText(text);
    // "A" has length < 2 so isItemNameLine returns false
    assertEqual(result.lineItems.length, 1, "single char filtered");
  });
});

describe("11. Grouped summary - labels on separate lines from prices", () => {
  test("extracts summary when labels and prices are separated", () => {
    const text = [
      "Burger $10.00",
      "Fries $4.00",
      "Subtotal",
      "Tax",
      "Total",
      "14.00",
      "1.12",
      "15.12",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.subtotal, 14.00, "grouped subtotal");
    assertEqual(result.tax, 1.12, "grouped tax");
    assertEqual(result.total, 15.12, "grouped total");
  });

  test("extracts grouped summary with tip label (tip is ignored)", () => {
    const text = [
      "Steak $25.00",
      "Subtotal",
      "Tax",
      "Tip",
      "Total",
      "25.00",
      "2.00",
      "5.00",
      "32.00",
    ].join("\n");
    const result = parseReceiptText(text);
    assertEqual(result.subtotal, 25.00, "grouped subtotal with tip");
    assertEqual(result.tax, 2.00, "grouped tax with tip");
    assertEqual(result.total, 32.00, "grouped total with tip");
  });
});

describe("12. Mixed formatting - real-world messy receipt", () => {
  test("parses a realistic messy receipt", () => {
    const text = [
      "MARIO'S ITALIAN BISTRO",
      "123 Main Street",
      "Tel: 555-0199",
      "03/08/2026  14:30",
      "Server: Mike  Table: 5",
      "--------------------------------",
      "2x Margherita Pizza  $24.00",
      "Caesar Salad  $11.50",
      "Garlic Bread  $6.00",
      "Sparkling Water  $3.50",
      "--------------------------------",
      "Subtotal  $45.00",
      "Tax  $3.60",
      "Tip  $9.00",
      "Total  $57.60",
      "--------------------------------",
      "Visa ending 4532",
      "Thank you for dining with us!",
      "www.mariosbistro.com",
    ].join("\n");

    const result = parseReceiptText(text);

    assertEqual(result.merchantName, "MARIO'S ITALIAN BISTRO", "merchant");
    assertEqual(result.lineItems.length, 4, "item count");
    assertEqual(result.lineItems[0].name, "Margherita Pizza", "2x stripped from pizza");
    assertEqual(result.lineItems[0].price, 24.00, "pizza price");
    assertEqual(result.lineItems[1].name, "Caesar Salad", "salad name");
    assertEqual(result.lineItems[1].price, 11.50, "salad price");
    assertEqual(result.lineItems[2].name, "Garlic Bread", "bread name");
    assertEqual(result.lineItems[2].price, 6.00, "bread price");
    assertEqual(result.lineItems[3].name, "Sparkling Water", "water name");
    assertEqual(result.lineItems[3].price, 3.50, "water price");
    assertEqual(result.subtotal, 45.00, "subtotal");
    assertEqual(result.tax, 3.60, "tax");
    assertEqual(result.total, 57.60, "total");
  });

  test("parses a receipt with next-line prices and noise", () => {
    const text = [
      "TOKYO RAMEN",
      "Order #4521",
      "Tonkotsu Ramen",
      "16.00",
      "Gyoza",
      "8.00",
      "Edamame",
      "5.00",
      "Subtotal",
      "29.00",
      "Tax",
      "2.32",
      "Total",
      "31.32",
      "Thank you!",
    ].join("\n");

    const result = parseReceiptText(text);

    assertEqual(result.merchantName, "TOKYO RAMEN", "merchant");
    assertEqual(result.lineItems.length, 3, "item count");
    assertEqual(result.lineItems[0].name, "Tonkotsu Ramen", "ramen");
    assertEqual(result.lineItems[1].name, "Gyoza", "gyoza");
    assertEqual(result.lineItems[2].name, "Edamame", "edamame");
    assertEqual(result.subtotal, 29.00, "subtotal");
    assertEqual(result.tax, 2.32, "tax");
    assertEqual(result.total, 31.32, "total");
  });

  test("parses receipt with mixed inline and next-line prices", () => {
    const text = [
      "Downtown Deli",
      "Turkey Club $12.50",
      "Side Salad",
      "4.00",
      "Lemonade $3.00",
      "Total $19.50",
    ].join("\n");

    const result = parseReceiptText(text);

    assertEqual(result.merchantName, "Downtown Deli", "merchant");
    assert(result.lineItems.length >= 2, "at least 2 items parsed");
    assertEqual(result.total, 19.50, "total");
  });
});

// ── Report ──────────────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failures.length > 0) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log(f));
}
console.log("=".repeat(60));
process.exit(failed > 0 ? 1 : 0);
