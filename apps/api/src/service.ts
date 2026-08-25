import type {
  Activity,
  AssistantResponse,
  Beneficiary,
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
  currency: "USD" | "MXN";
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
  currency: "USD" | "MXN";
  account_number: string;
  reference: string;
  status: "active" | "pending";
  created_at: string;
};
type PaymentRow = {
  id: string;
  beneficiary_id: string;
  beneficiary_name: string;
  source_currency: "USD" | "MXN";
  destination_currency: "USD" | "MXN";
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
    const toUsd = (amount: number, currency: "USD" | "MXN") => currency === "USD" ? amount : amount / 17.12;
    return {
      company: { name: "Asteria Imports", contactName: "Santiago Bustamante" },
      totalUsd: Number(accounts.reduce((total, account) => total + toUsd(account.balance, account.currency), 0).toFixed(2)),
      receivedThisMonth: Number(activity.filter((item) => item.direction === "in").reduce((total, item) => total + toUsd(item.amount, item.currency), 0).toFixed(2)),
      sentThisMonth: Number(payments.reduce((total, payment) => total + toUsd(payment.sourceAmount, payment.sourceCurrency), 0).toFixed(2)),
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

  function quote(sourceCurrency: "USD" | "MXN", destinationCurrency: "USD" | "MXN", sourceAmount: number): Quote {
    const rate = sourceCurrency === destinationCurrency ? 1 : sourceCurrency === "USD" ? 17.12 : 1 / 17.12;
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

  function createPayment(input: CreatePaymentInput): Payment {
    const beneficiary = listBeneficiaries().find((item) => item.id === input.beneficiaryId);
    if (!beneficiary) throw new Error("Beneficiary not found");
    if (beneficiary.currency !== input.destinationCurrency) throw new TreasuryValidationError("Destination currency must match beneficiary currency");
    const account = db.query<AccountRow, string>("SELECT * FROM accounts WHERE currency = ?").get(input.sourceCurrency);
    if (!account || input.sourceAmount > account.available) throw new TreasuryValidationError("Insufficient demo funds");
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
    return ["Mayo", "Abril", "Marzo"].map((month, index) => ({
      id: `statement_${index + 1}`,
      month,
      year: 2026,
      accountId: "account_usd",
      status: "available",
      downloadUrl: `/v1/statements/statement_${index + 1}/download`,
    }));
  }

  function assistant(message: string): AssistantResponse {
    const normalized = message.toLocaleLowerCase("es");
    if (normalized.includes("estado") || normalized.includes("statement")) {
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
    return {
      id: crypto.randomUUID(),
      text: "Puedo ayudarte con saldos, pagos, beneficiarios y estados de cuenta. Esta respuesta usa únicamente datos sintéticos de la demo.",
      action: { label: "Ir al inicio", route: "/" },
    };
  }

  return { assistant, createBeneficiary, createPayment, dashboard, listBeneficiaries, listPayments, quote, statements, submitPayment };
}

export type TreasuryService = ReturnType<typeof createTreasuryService>;
