// Import ideas from CSV data to the database
import { pool } from './server/db.js';

async function importIdeas() {
  const ideas = [
    { id: 12, title: "Anna Bida", content: "The implementation of Valocracy in enables the recognition and valu", user_id: 1, created_at: "2025-05-05T10:35:00.000Z", updated_at: "2025-05-05T10:35:00.000Z" },
    { id: 13, title: "Time Climb", content: "A platform for tokenizing your time and transforming it into a tradabl", user_id: 1, created_at: "2025-05-02T09:45:00.000Z", updated_at: "2025-05-02T09:45:00.000Z" },
    { id: 14, title: "resilient.edu", content: "It is a Learn to Earn platform that connects rural apprentices with gl", user_id: 1, created_at: "2025-05-02T13:08:00.000Z", updated_at: "2025-05-02T13:08:00.000Z" },
    { id: 15, title: "Ipê Community", content: "Central hub to claim passport, follow community, apps, members, lat", user_id: 1, created_at: "2025-05-02T17:40:00.000Z", updated_at: "2025-05-02T17:40:00.000Z" },
    { id: 16, title: "Ipê Mind Tree IMT", content: "(Ipê Mind Tree) is a DracoLogos initiative, with a mission to spa", user_id: 1, created_at: "2025-05-05T10:01:00.000Z", updated_at: "2025-05-05T10:01:00.000Z" },
    { id: 17, title: "JUNO *⃣ {acc}", content: "JUNO is built on a simple idea: celebrate play, suppor", user_id: 1, created_at: "2025-05-05T10:03:00.000Z", updated_at: "2025-05-05T10:03:00.000Z" },
    { id: 18, title: "Daily Insight", content: "Easy registration and payment process for people who would like to", user_id: 1, created_at: "2025-05-05T10:06:00.000Z", updated_at: "2025-05-05T10:06:00.000Z" },
    { id: 19, title: "Beer tap", content: "This is a complex project with multiple parts. The first part involv", user_id: 1, created_at: "2025-05-05T10:15:00.000Z", updated_at: "2025-05-05T10:15:00.000Z" },
    { id: 20, title: "Pullup record", content: "The goal is to keep a leaderboard of the maximum amount of pullups", user_id: 1, created_at: "2025-05-05T11:03:00.000Z", updated_at: "2025-05-05T11:03:00.000Z" },
    { id: 21, title: "Poker rewards", content: "Facilitate poker nights with a shared wallet to collect the bets and dis", user_id: 1, created_at: "2025-05-05T11:06:00.000Z", updated_at: "2025-05-05T11:06:00.000Z" },
    { id: 22, title: "Regenerative", content: "We will be building layers for a Governance platform that incentives", user_id: 1, created_at: "2025-06-10T09:51:00.000Z", updated_at: "2025-06-10T09:51:00.000Z" },
    { id: 23, title: "RideFlow", content: "RideFlow helps event organizers to create a better participant experienc", user_id: 1, created_at: "2025-06-10T09:28:00.000Z", updated_at: "2025-06-10T09:28:00.000Z" },
    { id: 24, title: "Unlocking Doors", content: "Yodl App using Ipê Passport to unlock the main door between 6-18hs", user_id: 1, created_at: "2025-05-02T09:52:00.000Z", updated_at: "2025-05-02T09:52:00.000Z" },
    { id: 25, title: "Ipê Ramp Center 🌟", content: "Ramp Center v1 – Building Connections, One Provider at a Time", user_id: 1, created_at: "2025-05-02T15:02:00.000Z", updated_at: "2025-05-02T15:02:00.000Z" }
  ];

  try {
    // Connect to the database
    const client = await pool.connect();
    
    console.log('Starting idea import...');

    for (const idea of ideas) {
      try {
        // Check if idea with this ID already exists
        const checkRes = await client.query('SELECT id FROM ideas WHERE id = $1', [idea.id]);
        
        if (checkRes.rows.length > 0) {
          console.log(`Idea with ID ${idea.id} already exists, skipping.`);
          continue;
        }
        
        // Insert the idea
        const res = await client.query(
          'INSERT INTO ideas (id, title, content, user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [idea.id, idea.title, idea.content, idea.user_id, idea.created_at, idea.updated_at]
        );
        
        console.log(`Imported idea ID: ${res.rows[0].id} - ${idea.title}`);
      } catch (err) {
        console.error(`Error importing idea ${idea.title}:`, err.message);
      }
    }
    
    console.log('Idea import completed.');
    client.release();
  } catch (err) {
    console.error('Error in import process:', err.message);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the import function
importIdeas().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});