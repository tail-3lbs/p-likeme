/**
 * Script to generate 100 test users with random community memberships
 * Run from server folder: node scripts/generate-users.js
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const usersDbPath = path.join(__dirname, '..', 'db', 'users.db');
const communitiesDbPath = path.join(__dirname, '..', 'db', 'communities.db');
const usersDb = new Database(usersDbPath);
const communitiesDb = new Database(communitiesDbPath);

async function generateUsers() {
    console.log('Clearing existing users and memberships...');

    // Clear user_communities first (foreign key dependency)
    usersDb.exec('DELETE FROM user_communities');
    usersDb.exec('DELETE FROM users');

    // Get all community IDs
    const communities = communitiesDb.prepare('SELECT id FROM communities').all();
    const communityIds = communities.map(c => c.id);
    console.log(`Found ${communityIds.length} communities: ${communityIds.join(', ')}`);

    console.log('Generating 100 users...');

    const insertUser = usersDb.prepare(`
        INSERT INTO users (username, password_hash)
        VALUES (?, ?)
    `);

    const insertMembership = usersDb.prepare(`
        INSERT INTO user_communities (user_id, community_id)
        VALUES (?, ?)
    `);

    const generateAll = usersDb.transaction(() => {
        for (let i = 1; i <= 100; i++) {
            const paddedNum = String(i).padStart(3, '0');
            const username = `user${paddedNum}`;
            // Password format: Pass + number + ! (meets password requirements)
            const password = `Pass${paddedNum}!`;
            const password_hash = bcrypt.hashSync(password, 10);

            const result = insertUser.run(username, password_hash);
            const userId = result.lastInsertRowid;

            // Randomly select 1-4 communities to join
            const numCommunities = Math.floor(Math.random() * 4) + 1;
            const shuffled = [...communityIds].sort(() => Math.random() - 0.5);
            const selectedCommunities = shuffled.slice(0, numCommunities);

            for (const communityId of selectedCommunities) {
                insertMembership.run(userId, communityId);
            }

            if (i % 10 === 0) {
                console.log(`Generated ${i} users...`);
            }
        }
    });

    generateAll();

    // Update member_count for each community based on actual data
    console.log('Updating community member counts...');

    for (const communityId of communityIds) {
        const count = usersDb.prepare(
            'SELECT COUNT(*) as count FROM user_communities WHERE community_id = ?'
        ).get(communityId);

        communitiesDb.prepare(
            'UPDATE communities SET member_count = ? WHERE id = ?'
        ).run(count.count, communityId);

        console.log(`Community ${communityId}: ${count.count} members`);
    }

    const userCount = usersDb.prepare('SELECT COUNT(*) as count FROM users').get();
    const membershipCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_communities').get();

    console.log(`\nDone!`);
    console.log(`Created ${userCount.count} users.`);
    console.log(`Created ${membershipCount.count} community memberships.`);
    console.log('Username format: user001 to user100');
    console.log('Password format: Pass001! to Pass100!');
}

generateUsers();
