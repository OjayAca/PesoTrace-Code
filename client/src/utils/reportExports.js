import { escapeCsv } from "./formatters.js";

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function sanitizeWorksheetName(name, fallback) {
  const cleaned = String(name || fallback)
    .replace(/[\\/*?:[\]]/g, " ")
    .trim()
    .slice(0, 31);

  return cleaned || fallback;
}

function createWorksheet(name, rows) {
  const cells = rows
    .map(
      (row) =>
        `<Row>${row
          .map((value) => {
            if (typeof value === "number" && Number.isFinite(value)) {
              return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
            }

            return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
          })
          .join("")}</Row>`,
    )
    .join("");

  return `<Worksheet ss:Name="${escapeXml(
    sanitizeWorksheetName(name, "Sheet"),
  )}"><Table>${cells}</Table></Worksheet>`;
}

function formatCurrencyText(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    currencyDisplay: "code",
  })
    .format(Number(value))
    .replace(/\u00A0/g, " ");
}

function formatDeltaText(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Not enough history";
  }

  const amount = Number(value);
  return `${amount >= 0 ? "+" : "-"}${formatCurrencyText(Math.abs(amount))}`;
}

function toFiniteNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function roundCurrencyNumber(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

function getBudgetContext(summary = {}) {
  const budget = toFiniteNumber(summary?.budget);

  if (budget === null) {
    return null;
  }

  const totalIncome = toFiniteNumber(summary?.totalIncome) ?? 0;
  const totalExpenses = toFiniteNumber(summary?.totalExpenses) ?? 0;
  const availableFunds =
    toFiniteNumber(summary?.availableFunds) ?? roundCurrencyNumber(budget + totalIncome);
  const remainingBudget =
    toFiniteNumber(summary?.budgetRemaining) ?? roundCurrencyNumber(availableFunds - totalExpenses);

  return {
    budget,
    availableFunds,
    remainingBudget,
  };
}

function formatBudgetStatusLabel(statusType) {
  switch (statusType) {
    case "remaining":
      return "On track";
    case "exact":
      return "Budget matched";
    case "deficit":
      return "Over budget";
    default:
      return "Not set";
  }
}

function formatAvailableFundsText(summary) {
  const context = getBudgetContext(summary);

  if (!context) {
    return "Not set";
  }

  return formatCurrencyText(context.availableFunds);
}

function formatRemainingBudgetText(summary) {
  const context = getBudgetContext(summary);

  if (!context) {
    return "Not set";
  }

  if (context.remainingBudget > 0) {
    return formatCurrencyText(context.remainingBudget);
  }

  if (context.remainingBudget < 0) {
    return `Over budget by ${formatCurrencyText(Math.abs(context.remainingBudget))}`;
  }

  return formatCurrencyText(0);
}

function formatEntryText(entry) {
  if (!entry) {
    return "None";
  }

  return `${entry.title || entry.category || "Entry"} (${formatCurrencyText(entry.amount)})`;
}

function escapePdfText(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function wrapLine(text, maxLength = 92) {
  const source = String(text ?? "");

  if (source.length <= maxLength) {
    return [source];
  }

  const words = source.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    lines.push(word.slice(0, maxLength));
    current = word.slice(maxLength);
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function buildPdfFromLines(lines) {
  const pageSize = 44;
  const pages = [];

  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }

  const fontObjectId = 3;
  const pageObjectOffset = 4;
  const contentObjectOffset = pageObjectOffset + pages.length;
  const objects = [];

  objects[0] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[1] = `<< /Type /Pages /Kids [${pages
    .map((_, index) => `${pageObjectOffset + index} 0 R`)
    .join(" ")}] /Count ${pages.length} >>`;
  objects[2] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;

  pages.forEach((pageLines, index) => {
    const contentObjectId = contentObjectOffset + index;
    const content = [
      "BT",
      "/F1 10 Tf",
      "50 760 Td",
      "14 TL",
      ...pageLines.map((line) => `(${escapePdfText(line)}) Tj T*`),
      "ET",
    ].join("\n");

    objects[pageObjectOffset - 1 + index] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectOffset - 1 + index] =
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function buildTransactionsCsv(transactions = []) {
  const headers = ["date", "title", "type", "accountRoute", "category", "tags", "amount", "notes", "recurring"];
  const rows = transactions.map((transaction) => [
    transaction.transactionDate || "",
    transaction.title || "",
    transaction.type || "",
    transaction.transferRoute || transaction.accountName || "",
    transaction.category || "",
    (transaction.tags || []).map((tag) => tag.name || tag).join("|"),
    transaction.amount ?? "",
    transaction.notes || "",
    transaction.isRecurring ? "yes" : "no",
  ]);

  return [headers.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
}

export function buildReportWorkbook({
  monthLabel,
  exportedAt,
  summary,
  reports,
  reportComparisons,
  transactions,
}) {
  const budgetContext = getBudgetContext(summary);
  const summaryRows = [
    ["Metric", "Value"],
    ["Month", monthLabel],
    ["Exported at", exportedAt],
    ["Total income", Number(summary?.totalIncome || 0)],
    ["Total expenses", Number(summary?.totalExpenses || 0)],
    ["Total transfers", Number(summary?.totalTransfers || 0)],
    ["Net balance", Number(summary?.netBalance || 0)],
    [
      "Budget",
      budgetContext ? formatCurrencyText(budgetContext.budget) : "Not set",
    ],
    ["Available funds", formatAvailableFundsText(summary)],
    ["Remaining budget", formatRemainingBudgetText(summary)],
    ["Budget status", formatBudgetStatusLabel(summary?.statusType)],
    ["Transaction count", Number(summary?.transactionCount || 0)],
    ["Largest expense", formatEntryText(reports?.highlights?.largestExpense)],
    ["Largest income", formatEntryText(reports?.highlights?.largestIncome)],
    [
      "Top expense category",
      reports?.highlights?.topExpenseCategory
        ? `${reports.highlights.topExpenseCategory.category} (${formatCurrencyText(
            reports.highlights.topExpenseCategory.amount,
          )})`
        : "None",
    ],
    ["Recurring templates", Number(reports?.highlights?.recurringTemplateCount || 0)],
    ["Subscriptions", Number(reports?.highlights?.subscriptionCount || 0)],
    ["Expense change vs previous month", formatDeltaText(reportComparisons?.expenseDelta)],
    ["Income change vs previous month", formatDeltaText(reportComparisons?.incomeDelta)],
    ["Budget change vs previous month", formatDeltaText(reportComparisons?.budgetDelta)],
  ];

  const trendRows = [
    ["Month", "Income", "Expenses", "Transfers", "Net balance", "Budget"],
    ...(reports?.monthlyTrend || []).map((item) => [
      item.label,
      Number(item.totalIncome || 0),
      Number(item.totalExpenses || 0),
      Number(item.totalTransfers || 0),
      Number(item.netBalance || 0),
      Number(item.budget || 0),
    ]),
  ];

  const categoryRows = [
    ["Category", "Amount"],
    ...(reports?.categoryBreakdown || []).map((item) => [
      item.category,
      Number(item.amount || 0),
    ]),
  ];

  const transactionRows = [
    ["Date", "Title", "Type", "Account Route", "Category", "Tags", "Amount", "Recurring", "Notes"],
    ...transactions.map((transaction) => [
      transaction.transactionDate || "",
      transaction.title || "",
      transaction.type || "",
      transaction.transferRoute || transaction.accountName || "",
      transaction.category || "",
      (transaction.tags || []).map((tag) => tag.name || tag).join(", "),
      Number(transaction.amount || 0),
      transaction.isRecurring ? "Yes" : "No",
      transaction.notes || "",
    ]),
  ];

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    createWorksheet("Summary", summaryRows),
    createWorksheet("Monthly Trend", trendRows),
    createWorksheet("Categories", categoryRows),
    createWorksheet("Transaction Log", transactionRows),
    "</Workbook>",
  ].join("");
}

export function buildReportPdf({
  monthLabel,
  exportedAt,
  summary,
  reports,
  reportComparisons,
  transactions,
}) {
  const budgetContext = getBudgetContext(summary);
  const lines = [
    ...wrapLine("PesoTrace Monthly Report"),
    ...wrapLine(`Month: ${monthLabel}`),
    ...wrapLine(`Exported: ${exportedAt}`),
    "",
    "Summary",
    ...wrapLine(`Total income: ${formatCurrencyText(summary?.totalIncome)}`),
    ...wrapLine(`Total expenses: ${formatCurrencyText(summary?.totalExpenses)}`),
    ...wrapLine(`Total transfers: ${formatCurrencyText(summary?.totalTransfers)}`),
    ...wrapLine(`Net balance: ${formatCurrencyText(summary?.netBalance)}`),
    ...wrapLine(
      `Budget: ${budgetContext ? formatCurrencyText(budgetContext.budget) : "Not set"}`,
    ),
    ...wrapLine(`Available funds: ${formatAvailableFundsText(summary)}`),
    ...wrapLine(`Remaining budget: ${formatRemainingBudgetText(summary)}`),
    ...wrapLine(`Budget status: ${formatBudgetStatusLabel(summary?.statusType)}`),
    ...wrapLine(`Transaction count: ${Number(summary?.transactionCount || 0)}`),
    "",
    "Highlights",
    ...wrapLine(`Largest expense: ${formatEntryText(reports?.highlights?.largestExpense)}`),
    ...wrapLine(`Largest income: ${formatEntryText(reports?.highlights?.largestIncome)}`),
    ...wrapLine(
      `Top expense category: ${
        reports?.highlights?.topExpenseCategory
          ? `${reports.highlights.topExpenseCategory.category} (${formatCurrencyText(
              reports.highlights.topExpenseCategory.amount,
            )})`
          : "None"
      }`,
    ),
    ...wrapLine(
      `Recurring templates: ${Number(reports?.highlights?.recurringTemplateCount || 0)}`,
    ),
    ...wrapLine(`Subscriptions: ${Number(reports?.highlights?.subscriptionCount || 0)}`),
    ...wrapLine(
      `Expense change vs previous month: ${formatDeltaText(reportComparisons?.expenseDelta)}`,
    ),
    ...wrapLine(
      `Income change vs previous month: ${formatDeltaText(reportComparisons?.incomeDelta)}`,
    ),
    ...wrapLine(
      `Budget change vs previous month: ${formatDeltaText(reportComparisons?.budgetDelta)}`,
    ),
    "",
    "Category Breakdown",
  ];

  if ((reports?.categoryBreakdown || []).length === 0) {
    lines.push("No category data for this month yet.");
  } else {
    for (const item of reports.categoryBreakdown) {
      lines.push(...wrapLine(`${item.category} | ${formatCurrencyText(item.amount)}`));
    }
  }

  lines.push("", "Monthly Trend");

  for (const item of reports?.monthlyTrend || []) {
    lines.push(
      ...wrapLine(
        `${item.label} | Income ${formatCurrencyText(item.totalIncome)} | Expenses ${formatCurrencyText(
          item.totalExpenses,
        )} | Transfers ${formatCurrencyText(item.totalTransfers)} | Net ${formatCurrencyText(
          item.netBalance,
        )} | Budget ${formatCurrencyText(item.budget)}`,
      ),
    );
  }

  lines.push("", "Transaction Log");

  if (transactions.length === 0) {
    lines.push("No transactions recorded for this month.");
  } else {
    for (const transaction of transactions) {
      lines.push(
        ...wrapLine(
          `${transaction.transactionDate || ""} | ${transaction.title || "Untitled"} | ${
            transaction.type || "unknown"
          } | ${transaction.transferRoute || transaction.accountName || "-"} | ${
            transaction.category || "Other"
          } | ${formatCurrencyText(transaction.amount)} | ${
            transaction.isRecurring ? "Recurring" : "Manual"
          }`,
        ),
      );

      if (transaction.notes) {
        lines.push(...wrapLine(`Notes: ${transaction.notes}`));
      }
    }
  }

  return buildPdfFromLines(lines);
}
