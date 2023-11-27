const { MongoClient } = require('mongodb');

// MongoDB connection URL
const url = 'mongodb://127.0.0.1:27017';

const dbName = 'vendor_db';

const client = new MongoClient(url, { useUnifiedTopology: true });

async function createUserAndGrantRoles() {
  try {
    // Connect to the MongoDB server
    await client.connect();

    const db = client.db(dbName);

    // Create a user with the specified roles
    await db.command({
      createUser: 'vendor_dev',
      pwd: 'vendor',
      roles: [
        { role: 'readWrite', db: 'vendor_db' },
        { role: 'read', db: 'performance_schema' },
      ],
    });

    
    console.log('User created and roles granted.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    // Close the MongoDB client
    await client.close();
  }
}

createUserAndGrantRoles()
.then(() => {
  console.log('mongo setup done');
})
.catch((err) => {
  console.log('error: ', err);
});
