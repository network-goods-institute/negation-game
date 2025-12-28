import { config } from "dotenv";
import { PrivyClient } from "@privy-io/server-auth";
import { logger } from "../../src/lib/logger";

type Options = {
  email?: string;
  userId?: string;
  appSettings: boolean;
};

const args = process.argv.slice(2);
const options: Options = { appSettings: true };

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if (arg === "--email") {
    options.email = args[i + 1];
    i += 1;
    continue;
  }

  if (arg.startsWith("--email=")) {
    options.email = arg.slice("--email=".length);
    continue;
  }

  if (arg === "--user-id" || arg === "--id") {
    options.userId = args[i + 1];
    i += 1;
    continue;
  }

  if (arg.startsWith("--user-id=")) {
    options.userId = arg.slice("--user-id=".length);
    continue;
  }

  if (arg.startsWith("--id=")) {
    options.userId = arg.slice("--id=".length);
    continue;
  }

  if (arg === "--no-app-settings") {
    options.appSettings = false;
    continue;
  }

  if (arg === "--app-settings") {
    options.appSettings = true;
    continue;
  }

  logger.warn("Unknown argument:", arg);
}

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
};

const formatDate = (value?: Date | null) => (value ? value.toISOString() : null);

const summarizeUser = (user: any) => ({
  id: user.id,
  createdAt: formatDate(user.createdAt),
  isGuest: user.isGuest,
  email: user.email
    ? {
        address: user.email.address,
        verifiedAt: formatDate(user.email.verifiedAt),
        latestVerifiedAt: formatDate(user.email.latestVerifiedAt),
      }
    : null,
  phone: user.phone
    ? {
        number: user.phone.number,
        verifiedAt: formatDate(user.phone.verifiedAt),
        latestVerifiedAt: formatDate(user.phone.latestVerifiedAt),
      }
    : null,
  google: user.google
    ? {
        email: user.google.email,
        subject: user.google.subject,
        name: user.google.name ?? null,
        verifiedAt: formatDate(user.google.verifiedAt),
        latestVerifiedAt: formatDate(user.google.latestVerifiedAt),
      }
    : null,
  linkedAccounts: (user.linkedAccounts ?? []).map((account: any) => ({
    type: account.type,
    address: account.address ?? null,
    email: account.email ?? null,
    username: account.username ?? null,
    subject: account.subject ?? null,
    number: account.number ?? null,
    walletClientType: account.walletClientType ?? null,
    chainType: account.chainType ?? null,
    verifiedAt: formatDate(account.verifiedAt),
    latestVerifiedAt: formatDate(account.latestVerifiedAt),
  })),
});

const run = async () => {
  if (!options.email && !options.userId) {
    logger.error("Provide --email or --user-id");
    process.exit(1);
  }

  config({ path: ".env.local" });

  const appId = requireEnv("NEXT_PUBLIC_PRIVY_APP_ID");
  const appSecret = requireEnv("PRIVY_APP_SECRET");

  const client = new PrivyClient(appId, appSecret);

  logger.info("Privy app:", { appId });

  if (options.appSettings) {
    try {
      const settings = await client.getAppSettings();
      logger.info("App settings:", {
        id: settings.id,
        name: settings.name,
        emailAuth: settings.emailAuth,
        googleOAuth: settings.googleOAuth,
        smsAuth: settings.smsAuth,
        allowlistEnabled: settings.allowlistEnabled,
        disablePlusEmails: settings.disablePlusEmails,
        termsAndConditionsUrl: settings.termsAndConditionsUrl ?? null,
        privacyPolicyUrl: settings.privacyPolicyUrl ?? null,
      });
    } catch (error) {
      logger.error("Failed to fetch app settings:", error);
    }
  }

  let userByEmail: any | null = null;
  let userById: any | null = null;

  if (options.email) {
    try {
      userByEmail = await client.getUserByEmail(options.email);
    } catch (error) {
      logger.error("Failed to fetch user by email:", error);
    }

    if (userByEmail) {
      logger.info("User by email:", summarizeUser(userByEmail));
    } else {
      logger.warn("No user found for email:", options.email);
    }
  }

  if (options.userId) {
    try {
      userById = await client.getUserById(options.userId);
    } catch (error) {
      logger.error("Failed to fetch user by id:", error);
    }

    if (userById) {
      logger.info("User by id:", summarizeUser(userById));
    }
  }

  if (userByEmail && userById && userByEmail.id !== userById.id) {
    logger.warn("Email user does not match user-id:", {
      emailUserId: userByEmail.id,
      userId: userById.id,
    });
  }
};

run().catch((error) => {
  logger.error("Privy inspect failed:", error);
  process.exit(1);
});
