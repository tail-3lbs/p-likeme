/**
 * Script to generate 100 test users with random community memberships and shares
 * Run from server folder: node scripts/generate-users.js
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const usersDbPath = path.join(__dirname, '..', 'db', 'users.db');
const communitiesDbPath = path.join(__dirname, '..', 'db', 'communities.db');
const threadsDbPath = path.join(__dirname, '..', 'db', 'threads.db');
const usersDb = new Database(usersDbPath);
const communitiesDb = new Database(communitiesDbPath);
const threadsDb = new Database(threadsDbPath);

// Sample share content
const sampleTitles = [
    '我的治疗经历分享',
    '今天感觉好多了',
    '寻求大家的建议',
    '一些心得体会',
    '坚持就是胜利',
    '感谢大家的支持',
    '新的一天，新的开始',
    '分享一个小技巧',
    '我的康复之路',
    '希望能帮到大家'
];

const sampleContents = [
    '最近尝试了一些新的方法，感觉效果还不错，想和大家分享一下。',
    '经过一段时间的调整，现在状态比之前好了很多。希望大家也能坚持下去！',
    '有没有朋友遇到过类似的情况？想听听大家的经验和建议。',
    '今天想记录一下自己的心路历程，希望对正在经历同样事情的朋友有所帮助。',
    '虽然过程很艰难，但我相信只要坚持，一定会好起来的。大家一起加油！',
    '感谢社区里每一位给我鼓励和支持的朋友，让我感到不再孤单。',
    '分享一些我觉得有用的资源和信息，希望能帮到需要的人。',
    '每天进步一点点，积累下来就是很大的改变。',
    '想和大家聊聊最近的一些想法和感受。',
    '记录生活中的小确幸，保持积极的心态很重要。'
];

async function generateUsers() {
    console.log('Clearing existing data...');

    // Clear threads first
    threadsDb.exec('DELETE FROM thread_communities');
    threadsDb.exec('DELETE FROM threads');

    // Clear user_communities and users
    usersDb.exec('DELETE FROM user_communities');
    usersDb.exec('DELETE FROM users');

    // Get all community IDs
    const communities = communitiesDb.prepare('SELECT id FROM communities').all();
    const communityIds = communities.map(c => c.id);
    console.log(`Found ${communityIds.length} communities`);

    console.log('Generating 100 users...');

    const insertUser = usersDb.prepare(`
        INSERT INTO users (username, password_hash)
        VALUES (?, ?)
    `);

    const insertMembership = usersDb.prepare(`
        INSERT INTO user_communities (user_id, community_id)
        VALUES (?, ?)
    `);

    const insertThread = threadsDb.prepare(`
        INSERT INTO threads (user_id, title, content)
        VALUES (?, ?, ?)
    `);

    const insertThreadCommunity = threadsDb.prepare(`
        INSERT INTO thread_communities (thread_id, community_id)
        VALUES (?, ?)
    `);

    // Store user -> joined communities mapping
    const userCommunities = {};

    // Generate users and memberships
    const generateUsersAndMemberships = usersDb.transaction(() => {
        for (let i = 1; i <= 100; i++) {
            const paddedNum = String(i).padStart(3, '0');
            const username = `user${paddedNum}`;
            const password = `Pass${paddedNum}!`;
            const password_hash = bcrypt.hashSync(password, 10);

            const result = insertUser.run(username, password_hash);
            const userId = Number(result.lastInsertRowid);

            // Randomly select 1-4 communities to join
            const numCommunities = Math.floor(Math.random() * 4) + 1;
            const shuffled = [...communityIds].sort(() => Math.random() - 0.5);
            const selectedCommunities = shuffled.slice(0, numCommunities);

            userCommunities[userId] = selectedCommunities;

            for (const communityId of selectedCommunities) {
                insertMembership.run(userId, communityId);
            }

            if (i % 10 === 0) {
                console.log(`Generated ${i} users...`);
            }
        }
    });

    generateUsersAndMemberships();

    // Generate threads/shares for each user
    console.log('Generating shares...');

    const generateThreads = threadsDb.transaction(() => {
        for (const [userIdStr, joinedCommunities] of Object.entries(userCommunities)) {
            const userId = parseInt(userIdStr);

            // Each user creates 0-3 shares
            const numShares = Math.floor(Math.random() * 4);

            for (let j = 0; j < numShares; j++) {
                const title = sampleTitles[Math.floor(Math.random() * sampleTitles.length)];
                const content = sampleContents[Math.floor(Math.random() * sampleContents.length)];

                const result = insertThread.run(userId, title, content);
                const threadId = Number(result.lastInsertRowid);

                // Link to 0-3 communities from the user's joined communities
                const maxLinks = Math.min(3, joinedCommunities.length);
                const numLinks = Math.floor(Math.random() * (maxLinks + 1)); // 0 to maxLinks
                const shuffledJoined = [...joinedCommunities].sort(() => Math.random() - 0.5);
                const linkedCommunities = shuffledJoined.slice(0, numLinks);

                for (const communityId of linkedCommunities) {
                    insertThreadCommunity.run(threadId, communityId);
                }
            }
        }
    });

    generateThreads();

    // Update member_count for each community based on actual data
    console.log('Updating community member counts...');

    for (const communityId of communityIds) {
        const count = usersDb.prepare(
            'SELECT COUNT(*) as count FROM user_communities WHERE community_id = ?'
        ).get(communityId);

        communitiesDb.prepare(
            'UPDATE communities SET member_count = ? WHERE id = ?'
        ).run(count.count, communityId);
    }

    const userCount = usersDb.prepare('SELECT COUNT(*) as count FROM users').get();
    const membershipCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_communities').get();
    const threadCount = threadsDb.prepare('SELECT COUNT(*) as count FROM threads').get();
    const threadCommunityCount = threadsDb.prepare('SELECT COUNT(*) as count FROM thread_communities').get();

    console.log(`\nDone!`);
    console.log(`Created ${userCount.count} users.`);
    console.log(`Created ${membershipCount.count} community memberships.`);
    console.log(`Created ${threadCount.count} shares.`);
    console.log(`Created ${threadCommunityCount.count} share-community links.`);
    console.log('Username format: user001 to user100');
    console.log('Password format: Pass001! to Pass100!');
}

generateUsers();
