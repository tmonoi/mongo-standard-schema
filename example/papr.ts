import { MongoClient } from 'mongodb';
import Client from '../src';

export let mongoClient: MongoClient;
const client = new Client();

export async function connect(): Promise<void> {
  mongoClient = await MongoClient.connect('mongodb://localhost:27017', {
    directConnection: true,
  });

  client.initialize(mongoClient.db('test'));

  await client.updateSchemas();
}

export async function disconnect(): Promise<void> {
  await mongoClient.close();
}

export default client;
