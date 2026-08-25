import { Database } from "bun:sqlite";

export function createDatabase(path = process.env.DATABASE_PATH ?? "efex-demo.sqlite") {
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      currency TEXT NOT NULL,
      name TEXT NOT NULL,
      balance REAL NOT NULL,
      available REAL NOT NULL,
      account_number TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      bank TEXT NOT NULL,
      currency TEXT NOT NULL,
      account_number TEXT NOT NULL,
      reference TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      beneficiary_id TEXT NOT NULL REFERENCES beneficiaries(id),
      source_currency TEXT NOT NULL,
      destination_currency TEXT NOT NULL,
      source_amount REAL NOT NULL,
      destination_amount REAL NOT NULL,
      fee REAL NOT NULL,
      rate REAL NOT NULL,
      reference TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kapso_messages (
      message_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );
  `);

  return db;
}

export type EfexDatabase = ReturnType<typeof createDatabase>;

export function seedDatabase(db: EfexDatabase) {
  const seed = db.transaction(() => {
    db.exec("DELETE FROM kapso_messages; DELETE FROM payments; DELETE FROM beneficiaries; DELETE FROM accounts;");

    const account = db.prepare(
      "INSERT INTO accounts VALUES ($id, $currency, $name, $balance, $available, $accountNumber)",
    );
    account.run({
      $id: "account_usd",
      $currency: "USD",
      $name: "Cuenta global USD",
      $balance: 900000,
      $available: 875000,
      $accountNumber: "•••• 1208",
    });
    account.run({
      $id: "account_mxn",
      $currency: "MXN",
      $name: "Cuenta local MXN",
      $balance: 700163.73,
      $available: 700163.73,
      $accountNumber: "•••• 8842",
    });

    const beneficiary = db.prepare(
      "INSERT INTO beneficiaries VALUES ($id, $name, $country, $bank, $currency, $accountNumber, $reference, $status, $createdAt)",
    );
    beneficiary.run({
      $id: "beneficiary_frutella",
      $name: "Frutella Company",
      $country: "México",
      $bank: "BBVA México",
      $currency: "MXN",
      $accountNumber: "•••• 8842",
      $reference: "FRUTELLA 01",
      $status: "active",
      $createdAt: "2026-05-18T08:30:00.000Z",
    });
    beneficiary.run({
      $id: "beneficiary_global_foods",
      $name: "Global Foods LLC",
      $country: "Estados Unidos",
      $bank: "Mercury",
      $currency: "USD",
      $accountNumber: "•••• 1002",
      $reference: "GLOBAL 12",
      $status: "active",
      $createdAt: "2026-05-10T08:30:00.000Z",
    });

    const payment = db.prepare(
      "INSERT INTO payments VALUES ($id, $beneficiaryId, $sourceCurrency, $destinationCurrency, $sourceAmount, $destinationAmount, $fee, $rate, $reference, $status, $createdAt, $updatedAt)",
    );
    payment.run({
      $id: "payment_1001",
      $beneficiaryId: "beneficiary_frutella",
      $sourceCurrency: "USD",
      $destinationCurrency: "MXN",
      $sourceAmount: 6900,
      $destinationAmount: 125000,
      $fee: 0,
      $rate: 18.115942,
      $reference: "Invoice 1001",
      $status: "approved",
      $createdAt: "2026-05-18T10:20:00.000Z",
      $updatedAt: "2026-05-18T10:25:00.000Z",
    });
    payment.run({
      $id: "payment_1002",
      $beneficiaryId: "beneficiary_global_foods",
      $sourceCurrency: "USD",
      $destinationCurrency: "USD",
      $sourceAmount: 42000,
      $destinationAmount: 42000,
      $fee: 0,
      $rate: 1,
      $reference: "Invoice 1002",
      $status: "processing",
      $createdAt: "2026-05-19T09:05:00.000Z",
      $updatedAt: "2026-05-19T09:05:00.000Z",
    });
  });

  seed();
}

export function ensureSeeded(db: EfexDatabase) {
  const row = db.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM accounts").get();
  if (!row?.count) seedDatabase(db);
}
