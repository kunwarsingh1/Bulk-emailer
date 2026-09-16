import mongoose from 'mongoose';

const globalForMongoose = globalThis as unknown as {
  mongooseCache?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

if (!globalForMongoose.mongooseCache) {
  globalForMongoose.mongooseCache = { conn: null, promise: null };
}

const cached = globalForMongoose.mongooseCache!;

export async function db() {
  if (cached.conn) return cached.conn;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');

  const MONGODB_DB = process.env.MONGODB_DB;

  if (!cached.promise) {
    const uri = MONGODB_DB
      ? `${MONGODB_URI.replace(/\/+$/, '')}/${MONGODB_DB}`
      : MONGODB_URI;

    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
