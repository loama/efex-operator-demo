import type {
  Activity,
  AssistantResponse,
  Beneficiary,
  Currency,
  CreateBeneficiaryInput,
  CreatePaymentInput,
  Dashboard,
  Payment,
  Quote,
  Statement,
} from "@efex/contracts";
import type { EfexDatabase } from "./database";

type AccountRow = {
  id: string;
  currency: Currency;
  name: string;
  balance: number;
  available: number;
  account_number: string;
};
type BeneficiaryRow = {
  id: string;
  name: string;
  country: string;
  bank: string;
  currency: Currency;
  account_number: string;
  reference: string;
  status: "active" | "pending";
  created_at: string;
};
type PaymentRow = {
  id: string;
  beneficiary_id: string;
  beneficiary_name: string;
  source_currency: Currency;
  destination_currency: Currency;
  source_amount: number;
  destination_amount: number;
  fee: number;
  rate: number;
  reference: string;
  status: "draft" | "processing" | "approved";
  created_at: string;
  updated_at: string;
};

export class TreasuryValidationError extends Error {}

const unitsPerUsd: Record<Currency, number> = {
  USD: 1,
  MXN: 17.12,
  EUR: 0.92,
  COP: 4120,
  UYU: 43.1,
  ARS: 1325,
};

const accountFromRow = (row: AccountRow) => ({
  id: row.id,
  currency: row.currency,
  name: row.name,
  balance: row.balance,
  available: row.available,
  accountNumber: row.account_number,
});

const beneficiaryFromRow = (row: BeneficiaryRow): Beneficiary => ({
  id: row.id,
  name: row.name,
  country: row.country,
  bank: row.bank,
  currency: row.currency,
  accountNumber: row.account_number,
  reference: row.reference,
  status: row.status,
  createdAt: row.created_at,
});

const paymentFromRow = (row: PaymentRow): Payment => ({
  id: row.id,
  beneficiaryId: row.beneficiary_id,
  beneficiaryName: row.beneficiary_name,
  sourceCurrency: row.source_currency,
  destinationCurrency: row.destination_currency,
  sourceAmount: row.source_amount,
  destinationAmount: row.destination_amount,
  fee: row.fee,
  rate: row.rate,
  reference: row.reference,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function createTreasuryService(db: EfexDatabase) {
  const paymentQuery = `
    SELECT payments.*, beneficiaries.name AS beneficiary_name
    FROM payments
    JOIN beneficiaries ON beneficiaries.id = payments.beneficiary_id
  `;

  function listBeneficiaries(): Beneficiary[] {
    return db
      .query<BeneficiaryRow, []>("SELECT * FROM beneficiaries ORDER BY created_at DESC")
      .all()
      .map(beneficiaryFromRow);
  }

  function listPayments(): Payment[] {
    return db
      .query<PaymentRow, []>(`${paymentQuery} ORDER BY payments.created_at DESC`)
      .all()
      .map(paymentFromRow);
  }

  function dashboard(): Dashboard {
    const accounts = db.query<AccountRow, []>("SELECT * FROM accounts ORDER BY currency DESC").all().map(accountFromRow);
    const payments = listPayments();
    const activity: Activity[] = [
      {
        id: "income_1",
        title: "Global Foods LLC",
        subtitle: "Transferencia recibida",
        amount: 150000,
        currency: "USD",
        direction: "in",
        status: "approved",
        createdAt: "2026-05-18T10:21:00.000Z",
      },
      ...payments.slice(0, 3).map((payment) => ({
        id: payment.id,
        title: payment.beneficiaryName,
        subtitle: payment.reference,
        amount: payment.sourceAmount,
        currency: payment.sourceCurrency,
        direction: "out" as const,
        status: payment.status === "approved" ? ("approved" as const) : ("processing" as const),
        createdAt: payment.createdAt,
      })),
    ];
    const toUsd = (amount: number, currency: Currency) => amount / unitsPerUsd[currency];
    return {
      company: { name: "Asteria Imports", contactName: "Santiago Bustamante" },
      totalUsd: Number(accounts.reduce((total, account) => total + toUsd(account.balance, account.currency), 0).toFixed(2)),
      demoReceivedUsd: Number(activity.filter((item) => item.direction === "in").reduce((total, item) => total + toUsd(item.amount, item.currency), 0).toFixed(2)),
      demoSentUsd: Number(payments.reduce((total, payment) => total + toUsd(payment.sourceAmount, payment.sourceCurrency), 0).toFixed(2)),
      accounts,
      activity,
    };
  }

  function createBeneficiary(input: CreateBeneficiaryInput): Beneficiary {
    const id = `beneficiary_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO beneficiaries VALUES ($id, $name, $country, $bank, $currency, $accountNumber, $reference, 'active', $createdAt)",
    ).run({
      $id: id,
      $name: input.name,
      $country: input.country,
      $bank: input.bank,
      $currency: input.currency,
      $accountNumber: `•••• ${input.accountNumber.slice(-4)}`,
      $reference: input.reference,
      $createdAt: createdAt,
    });
    return listBeneficiaries().find((item) => item.id === id)!;
  }

  function quote(sourceCurrency: Currency, destinationCurrency: Currency, sourceAmount: number): Quote {
    const rate = unitsPerUsd[destinationCurrency] / unitsPerUsd[sourceCurrency];
    const fee = 0;
    return {
      sourceCurrency,
      destinationCurrency,
      sourceAmount,
      destinationAmount: Number((sourceAmount * rate).toFixed(2)),
      rate,
      fee,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }

  const createPaymentTransaction = db.transaction((input: CreatePaymentInput): Payment => {
    const beneficiary = listBeneficiaries().find((item) => item.id === input.beneficiaryId);
    if (!beneficiary) throw new Error("Beneficiary not found");
    if (beneficiary.currency !== input.destinationCurrency) throw new TreasuryValidationError("Destination currency must match beneficiary currency");
    const account = db.query<AccountRow, string>("SELECT * FROM accounts WHERE currency = ?").get(input.sourceCurrency);
    const reservation = db.query<{ reserved: number }, string>(
      "SELECT COALESCE(SUM(source_amount), 0) AS reserved FROM payments WHERE source_currency = ? AND status IN ('draft', 'processing')",
    ).get(input.sourceCurrency)?.reserved ?? 0;
    if (!account || input.sourceAmount + reservation > account.available) throw new TreasuryValidationError("Insufficient demo funds");
    const priced = quote(input.sourceCurrency, input.destinationCurrency, input.sourceAmount);
    const id = `payment_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    db.prepare(
      "INSERT INTO payments VALUES ($id, $beneficiaryId, $sourceCurrency, $destinationCurrency, $sourceAmount, $destinationAmount, $fee, $rate, $reference, 'draft', $createdAt, $updatedAt)",
    ).run({
      $id: id,
      $beneficiaryId: input.beneficiaryId,
      $sourceCurrency: input.sourceCurrency,
      $destinationCurrency: input.destinationCurrency,
      $sourceAmount: input.sourceAmount,
      $destinationAmount: priced.destinationAmount,
      $fee: priced.fee,
      $rate: priced.rate,
      $reference: input.reference,
      $createdAt: createdAt,
      $updatedAt: createdAt,
    });
    return listPayments().find((item) => item.id === id)!;
  });

  function createPayment(input: CreatePaymentInput): Payment {
    return createPaymentTransaction(input);
  }

  function submitPayment(id: string): Payment | undefined {
    const updatedAt = new Date().toISOString();
    const result = db.prepare("UPDATE payments SET status = 'processing', updated_at = $updatedAt WHERE id = $id AND status = 'draft'").run({
      $id: id,
      $updatedAt: updatedAt,
    });
    if (!result.changes) return undefined;
    return listPayments().find((item) => item.id === id);
  }

  function statements(): Statement[] {
    return [
      { id: "statement_1", month: "Mayo", openingBalance: 850000, incoming: 150000, outgoing: 48900, closingBalance: 951100 },
      { id: "statement_2", month: "Abril", openingBalance: 790000, incoming: 112500, outgoing: 52500, closingBalance: 850000 },
      { id: "statement_3", month: "Marzo", openingBalance: 740000, incoming: 90000, outgoing: 40000, closingBalance: 790000 },
    ].map((statement) => ({
      ...statement,
      year: 2026,
      accountId: "account_usd",
      status: "available" as const,
      downloadUrl: `/v1/statements/${statement.id}/download`,
    }));
  }

  function assistant(message: string): AssistantResponse {
    const normalized = message.toLocaleLowerCase("es");
    if (normalized.includes("estado de cuenta") || normalized.includes("statement")) {
      return {
        id: crypto.randomUUID(),
        text: "Tu estado de cuenta de mayo está disponible. Incluye todos los movimientos de la cuenta USD.",
        attachment: { label: "Estado de cuenta, mayo 2026", url: "/v1/statements/statement_1/download", kind: "pdf" },
      };
    }
    if (normalized.includes("pago") || normalized.includes("transfer")) {
      const latest = listPayments()[0];
      return {
        id: crypto.randomUUID(),
        text: latest
          ? `El pago más reciente a ${latest.beneficiaryName} está ${latest.status === "approved" ? "aprobado" : "en proceso"}.`
          : "Todavía no hay pagos en la cuenta demo.",
        action: { label: "Ver pagos", route: "/payments" },
      };
    }
    if (normalized.includes("saldo") || normalized.includes("balance")) {
      const data = dashboard();
      return {
        id: crypto.randomUUID(),
        text: `El saldo consolidado de la cuenta demo es ${data.totalUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })}.`,
        action: { label: "Ver cuentas", route: "/accounts" },
      };
    }
    if (normalized.includes("beneficiario") || normalized.includes("destino")) {
      const beneficiaries = listBeneficiaries();
      return {
        id: crypto.randomUUID(),
        text: `Tienes ${beneficiaries.length} beneficiarios en la cuenta demo. Puedes consultarlos o añadir un destino nuevo desde Beneficiarios.`,
        action: { label: "Ver beneficiarios", route: "/beneficiaries" },
      };
    }
    return {
      id: crypto.randomUUID(),
      text: "Puedo ayudarte con saldos, pagos, beneficiarios y estados de cuenta. Esta respuesta usa únicamente datos sintéticos de la demo.",
      action: { label: "Ir al inicio", route: "/" },
    };
  }

  const claimKapsoMessageTransaction = db.transaction((messageId: string) => {
    const now = new Date().toISOString();
    const inserted = db.prepare(
      "INSERT INTO kapso_deliveries VALUES ($messageId, 'processing', 0, 0, $createdAt, $updatedAt) ON CONFLICT(message_id) DO NOTHING",
    ).run({ $messageId: messageId, $createdAt: now, $updatedAt: now });
    if (inserted.changes === 1) return { claimed: true, textSent: false, documentSent: false };

    const existing = db.query<{ status: string; text_sent: number; document_sent: number; updated_at: string }, string>(
      "SELECT status, text_sent, document_sent, updated_at FROM kapso_deliveries WHERE message_id = ?",
    ).get(messageId);
    if (existing?.status === "processing" && Date.parse(existing.updated_at) <= Date.now() - 15_000) {
      const reclaimed = db.prepare(
        "UPDATE kapso_deliveries SET updated_at = $updatedAt WHERE message_id = $messageId AND status = 'processing' AND updated_at = $previousUpdatedAt",
      ).run({ $messageId: messageId, $updatedAt: now, $previousUpdatedAt: existing.updated_at });
      return { claimed: reclaimed.changes === 1, textSent: Boolean(existing.text_sent), documentSent: Boolean(existing.document_sent) };
    }
    if (existing?.status !== "failed") return { claimed: false, textSent: Boolean(existing?.text_sent), documentSent: Boolean(existing?.document_sent) };
    const resumed = db.prepare("UPDATE kapso_deliveries SET status = 'processing', updated_at = $updatedAt WHERE message_id = $messageId AND status = 'failed'").run({
      $messageId: messageId,
      $updatedAt: now,
    });
    return { claimed: resumed.changes === 1, textSent: Boolean(existing.text_sent), documentSent: Boolean(existing.document_sent) };
  });

  function claimKapsoMessage(messageId: string) {
    return claimKapsoMessageTransaction(messageId);
  }

  function markKapsoTextSent(messageId: string) {
    db.prepare("UPDATE kapso_deliveries SET text_sent = 1, updated_at = $updatedAt WHERE message_id = $messageId").run({ $messageId: messageId, $updatedAt: new Date().toISOString() });
  }

  function markKapsoDocumentSent(messageId: string) {
    db.prepare("UPDATE kapso_deliveries SET document_sent = 1, updated_at = $updatedAt WHERE message_id = $messageId").run({ $messageId: messageId, $updatedAt: new Date().toISOString() });
  }

  function completeKapsoMessage(messageId: string) {
    db.prepare("UPDATE kapso_deliveries SET status = 'complete', updated_at = $updatedAt WHERE message_id = $messageId").run({ $messageId: messageId, $updatedAt: new Date().toISOString() });
  }

  function failKapsoMessage(messageId: string) {
    db.prepare("UPDATE kapso_deliveries SET status = 'failed', updated_at = $updatedAt WHERE message_id = $messageId").run({ $messageId: messageId, $updatedAt: new Date().toISOString() });
  }

  return { assistant, claimKapsoMessage, completeKapsoMessage, createBeneficiary, createPayment, dashboard, failKapsoMessage, listBeneficiaries, listPayments, markKapsoDocumentSent, markKapsoTextSent, quote, statements, submitPayment };
}

export type TreasuryService = ReturnType<typeof createTreasuryService>;
