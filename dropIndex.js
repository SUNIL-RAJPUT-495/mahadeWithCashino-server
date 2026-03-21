import mongoose from 'mongoose';

const uri = "mongodb://sunilsinghshekhawat495_db_user:1hydpleFbFQwVnLl@ac-yrdg2vj-shard-00-00.n1xfeny.mongodb.net:27017,ac-yrdg2vj-shard-00-01.n1xfeny.mongodb.net:27017,ac-yrdg2vj-shard-00-02.n1xfeny.mongodb.net:27017/?ssl=true&replicaSet=atlas-lz3tfu-shard-0&authSource=admin&appName=MahadevMatka";

async function run() {
  await mongoose.connect(uri, { dbName: 'test' });
  try {
    await mongoose.connection.collection('users').dropIndex('email_1');
    console.log("Successfully dropped email_1 index");
  } catch (err) {
    console.log("Error dropping index: ", err.message);
  }
  process.exit(0);
}
run();
