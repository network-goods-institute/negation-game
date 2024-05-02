import { MongoClient } from "mongodb";

export const db = async <T>(
  callback: (client: MongoClient) => Promise<T>
): Promise<T> => {
  if (!process.env.MONGO_CONNECTION_STRING)
    throw new Error("MONGO_CONNECTION_STRING is not defined");

  const client = new MongoClient(process.env.MONGO_CONNECTION_STRING);

  client.connect();

  try {
    return await callback(client);
  } finally {
    client.close();
  }
};

export const dbTransaction = async <T>(
  callback: (client: MongoClient) => Promise<T>
): Promise<T> => {
  return await db(async (client) => {
    const session = client.startSession();

    try {
      return await session.withTransaction(async () => {
        return await callback(client);
      });
    } finally {
      await session.endSession();
    }
  });
};
