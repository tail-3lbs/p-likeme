/**
 * Complete Database Seed Script
 * Clears all data and generates consistent test data
 *
 * Run from server folder: node scripts/seed-database.js
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// Database connections
const communitiesDbPath = path.join(__dirname, '..', 'db', 'communities.db');
const usersDbPath = path.join(__dirname, '..', 'db', 'users.db');
const threadsDbPath = path.join(__dirname, '..', 'db', 'threads.db');
const repliesDbPath = path.join(__dirname, '..', 'db', 'replies.db');

const communitiesDb = new Database(communitiesDbPath);
const usersDb = new Database(usersDbPath);
const threadsDb = new Database(threadsDbPath);
const repliesDb = new Database(repliesDbPath);

// ============ SEED DATA ============

// 15 female-focused health communities
const communities = [
    { name: '乳腺癌', description: '抗癌路上，我们同行。分享乳腺癌治疗经验，传递希望与力量。', keywords: '乳腺癌 乳腺 癌症 肿瘤 化疗 乳房' },
    { name: '宫颈癌', description: '分享宫颈癌防治经验，交流治疗心得，互相支持共同面对。', keywords: '宫颈癌 宫颈 HPV 癌症 肿瘤 筛查' },
    { name: '卵巢癌', description: '分享卵巢癌治疗经验，传递希望与力量，抗癌路上我们同行。', keywords: '卵巢癌 卵巢 癌症 肿瘤 化疗 CA125' },
    { name: '子宫内膜癌', description: '交流子宫内膜癌的治疗经验，分享康复心得，互相支持。', keywords: '子宫内膜癌 子宫癌 癌症 肿瘤 子宫' },
    { name: '心血管疾病', description: '关注女性心血管健康，分享预防和治疗经验，守护心脏健康。', keywords: '心血管 心脏病 冠心病 高血压 心肌梗死' },
    { name: '脑卒中', description: '分享脑卒中预防和康复经验，交流治疗心得，互相鼓励。', keywords: '脑卒中 中风 脑梗 脑出血 康复 偏瘫' },
    { name: '糖尿病', description: '分享血糖管理经验，交流饮食和运动心得，互相鼓励共同面对糖尿病。', keywords: '糖尿病 血糖 胰岛素 糖尿 妊娠糖尿病' },
    { name: '阿尔茨海默症', description: '为阿尔茨海默症患者及家属提供支持，分享护理经验和应对方法。', keywords: '阿尔茨海默症 老年痴呆 记忆 认知障碍 痴呆' },
    { name: '子宫内膜异位症', description: '分享子宫内膜异位症的治疗经验，交流缓解疼痛的方法，互相鼓励。', keywords: '子宫内膜异位症 内异症 痛经 月经 巧克力囊肿' },
    { name: '子宫肌瘤', description: '交流子宫肌瘤的治疗方案，分享康复经验，互相支持。', keywords: '子宫肌瘤 肌瘤 子宫 月经 出血' },
    { name: '经前综合征', description: '分享缓解经前综合征的方法，交流调理经验，互相理解与支持。', keywords: '经前综合征 PMS 经前期 月经 情绪波动 痛经' },
    { name: '不孕症', description: '分享备孕和治疗经验，交流心路历程，互相鼓励共同面对不孕困扰。', keywords: '不孕症 不孕 备孕 试管婴儿 IVF 生育' },
    { name: '性传播感染', description: '分享性传播感染的防治知识，交流治疗经验，消除偏见互相支持。', keywords: '性传播感染 STI STD 性病 HPV 衣原体' },
    { name: '抑郁症', description: '在这里你不孤单。分享心路历程，获得理解与支持，一起走向阳光。', keywords: '抑郁症 抑郁 心理 情绪 心理健康 产后抑郁' },
    { name: '焦虑症', description: '分享应对焦虑的方法，交流放松技巧，互相支持共同面对焦虑。', keywords: '焦虑症 焦虑 紧张 恐慌 心理 压力' }
];

// Sample thread content
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
    '希望能帮到大家',
    '最近的一些变化',
    '终于找到了适合的方法',
    '给新病友的建议',
    '复诊归来，情况不错',
    '日常管理小窍门'
];

const sampleContents = [
    '最近尝试了一些新的方法，感觉效果还不错，想和大家分享一下。经过医生的建议，调整了一些生活习惯，现在状态稳定了很多。',
    '经过一段时间的调整，现在状态比之前好了很多。希望大家也能坚持下去！记住，每一天的小进步都是胜利。',
    '有没有朋友遇到过类似的情况？想听听大家的经验和建议。最近遇到了一些困扰，不知道该怎么处理比较好。',
    '今天想记录一下自己的心路历程，希望对正在经历同样事情的朋友有所帮助。从确诊到现在，已经过去了一年多。',
    '虽然过程很艰难，但我相信只要坚持，一定会好起来的。大家一起加油！每当想放弃的时候，就来这里看看大家的分享。',
    '感谢社区里每一位给我鼓励和支持的朋友，让我感到不再孤单。有你们真好，这条路走起来不再那么艰难。',
    '分享一些我觉得有用的资源和信息，希望能帮到需要的人。这是我整理的一些经验，供大家参考。',
    '每天进步一点点，积累下来就是很大的改变。回头看看自己走过的路，其实已经进步了很多。',
    '想和大家聊聊最近的一些想法和感受。有时候真的需要找个地方倾诉一下，谢谢大家愿意倾听。',
    '记录生活中的小确幸，保持积极的心态很重要。今天阳光很好，心情也跟着好起来了。',
    '刚从医院回来，医生说恢复得不错，继续保持就好。分享给大家，希望能给正在治疗的朋友一些信心。',
    '尝试了大家推荐的方法，真的有效果！感谢社区里的每一位朋友，你们的建议太宝贵了。',
    '作为一个"老病号"，想给刚确诊的朋友说几句话：不要害怕，我们都在这里陪着你。',
    '今天整理了一下自己的用药记录和生活日志，发现规律作息真的很重要。分享给大家参考。',
    '最近天气变化大，大家要注意身体。我这几天状态有些波动，正在调整中。'
];

// Sample reply content
const sampleReplies = [
    '谢谢分享，对我很有帮助！',
    '我也有类似的经历，深有同感。',
    '加油！我们一起坚持！',
    '请问具体是怎么做的呢？能详细说说吗？',
    '感谢你的分享，收藏了！',
    '你说得对，心态真的很重要。',
    '希望你越来越好！',
    '我最近也在尝试这个方法，效果还不错。',
    '太好了，恭喜你！',
    '同意楼主的观点，我也是这么做的。',
    '这个建议很实用，谢谢！',
    '请问你是在哪家医院看的？',
    '我也想试试，请问有什么需要注意的吗？',
    '支持你！我们都会好起来的。',
    '感同身受，抱抱你。',
    '你的分享给了我很大的信心，谢谢！',
    '我之前也遇到过，后来慢慢就好了。',
    '坚持就是胜利，一起加油！',
    '请问这个方法适合所有人吗？',
    '学习了，感谢分享！',
    '我觉得你说得很有道理。',
    '这个信息很有用，记下来了。',
    '希望我们都能早日康复！',
    '你真棒，继续保持！',
    '感谢你的鼓励，我会继续努力的。'
];

// Replies to replies (for stacked conversation)
const sampleReplyToReplies = [
    '对的，我也觉得是这样。',
    '谢谢你的回复！',
    '嗯嗯，同意你说的。',
    '确实如此，我也有同感。',
    '谢谢你的建议！',
    '好的，我会注意的。',
    '是的，这点很重要。',
    '明白了，谢谢解答！',
    '你说得很对！',
    '感谢你的分享！'
];

// ============ MAIN FUNCTIONS ============

function clearAllData() {
    console.log('Step 1: Clearing all data...');

    // Clear replies database
    repliesDb.exec('DELETE FROM replies');
    repliesDb.exec("DELETE FROM sqlite_sequence WHERE name='replies'");

    // Clear threads database
    threadsDb.exec('DELETE FROM thread_communities');
    threadsDb.exec('DELETE FROM threads');
    threadsDb.exec("DELETE FROM sqlite_sequence WHERE name='threads'");

    // Clear users database
    usersDb.exec('DELETE FROM user_communities');
    usersDb.exec('DELETE FROM users');
    usersDb.exec("DELETE FROM sqlite_sequence WHERE name='users'");

    // Clear communities database
    communitiesDb.exec('DELETE FROM communities');
    communitiesDb.exec("DELETE FROM sqlite_sequence WHERE name='communities'");

    console.log('   All tables cleared.');
}

function seedCommunities() {
    console.log('Step 2: Seeding 15 communities...');

    const insert = communitiesDb.prepare(`
        INSERT INTO communities (name, description, keywords, member_count)
        VALUES (@name, @description, @keywords, 0)
    `);

    const insertMany = communitiesDb.transaction((items) => {
        for (const item of items) {
            insert.run(item);
        }
    });

    insertMany(communities);
    console.log('   15 communities created.');
}

function seedUsers() {
    console.log('Step 3: Seeding 100 test users...');

    const insertUser = usersDb.prepare(`
        INSERT INTO users (username, password_hash)
        VALUES (?, ?)
    `);

    const generateUsers = usersDb.transaction(() => {
        for (let i = 1; i <= 100; i++) {
            const paddedNum = String(i).padStart(3, '0');
            const username = `user${paddedNum}`;
            const password = `Pass${paddedNum}!`;
            const password_hash = bcrypt.hashSync(password, 10);
            insertUser.run(username, password_hash);
        }
    });

    generateUsers();
    console.log('   100 users created.');
    console.log('   Username format: user001 to user100');
    console.log('   Password format: Pass001! to Pass100!');
}

function linkUsersToCommunities() {
    console.log('Step 4: Linking users to communities...');

    // Get all user IDs and community IDs
    const users = usersDb.prepare('SELECT id FROM users').all();
    const communityIds = communitiesDb.prepare('SELECT id FROM communities').all().map(c => c.id);

    const insertMembership = usersDb.prepare(`
        INSERT INTO user_communities (user_id, community_id)
        VALUES (?, ?)
    `);

    // Track memberships for thread generation
    const userCommunities = {};

    const linkUsers = usersDb.transaction(() => {
        for (const user of users) {
            // Each user joins 1-5 random communities
            const numCommunities = Math.floor(Math.random() * 5) + 1;
            const shuffled = [...communityIds].sort(() => Math.random() - 0.5);
            const selectedCommunities = shuffled.slice(0, numCommunities);

            userCommunities[user.id] = selectedCommunities;

            for (const communityId of selectedCommunities) {
                insertMembership.run(user.id, communityId);
            }
        }
    });

    linkUsers();

    // Update member_count for each community
    console.log('   Updating member counts...');
    for (const communityId of communityIds) {
        const count = usersDb.prepare(
            'SELECT COUNT(*) as count FROM user_communities WHERE community_id = ?'
        ).get(communityId);

        communitiesDb.prepare(
            'UPDATE communities SET member_count = ? WHERE id = ?'
        ).run(count.count, communityId);
    }

    const membershipCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_communities').get();
    console.log(`   ${membershipCount.count} user-community links created.`);

    return userCommunities;
}

function generateThreads(userCommunities) {
    console.log('Step 5: Generating threads...');

    const insertThread = threadsDb.prepare(`
        INSERT INTO threads (user_id, title, content, created_at)
        VALUES (?, ?, ?, ?)
    `);

    const insertThreadCommunity = threadsDb.prepare(`
        INSERT INTO thread_communities (thread_id, community_id)
        VALUES (?, ?)
    `);

    const generateAllThreads = threadsDb.transaction(() => {
        let threadCount = 0;

        for (const [userIdStr, joinedCommunities] of Object.entries(userCommunities)) {
            const userId = parseInt(userIdStr);

            // Each user creates 0-3 threads
            const numThreads = Math.floor(Math.random() * 4);

            for (let j = 0; j < numThreads; j++) {
                const title = sampleTitles[Math.floor(Math.random() * sampleTitles.length)];
                const content = sampleContents[Math.floor(Math.random() * sampleContents.length)];

                // Random time offset (0-30 days ago)
                const now = new Date();
                const daysAgo = Math.floor(Math.random() * 30);
                const hoursAgo = Math.floor(Math.random() * 24);
                const pastDate = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
                const timestamp = pastDate.toISOString().replace('T', ' ').substring(0, 19);

                const result = insertThread.run(userId, title, content, timestamp);
                const threadId = Number(result.lastInsertRowid);
                threadCount++;

                // Link to 1-3 communities from the user's joined communities
                if (joinedCommunities.length > 0) {
                    const maxLinks = Math.min(3, joinedCommunities.length);
                    const numLinks = Math.floor(Math.random() * maxLinks) + 1; // At least 1
                    const shuffledJoined = [...joinedCommunities].sort(() => Math.random() - 0.5);
                    const linkedCommunities = shuffledJoined.slice(0, numLinks);

                    for (const communityId of linkedCommunities) {
                        insertThreadCommunity.run(threadId, communityId);
                    }
                }
            }
        }

        return threadCount;
    });

    const threadCount = generateAllThreads();
    const threadCommunityCount = threadsDb.prepare('SELECT COUNT(*) as count FROM thread_communities').get();

    console.log(`   ${threadCount} threads created.`);
    console.log(`   ${threadCommunityCount.count} thread-community links created.`);
}

function generateReplies() {
    console.log('Step 6: Generating replies...');

    // Get all threads (with created_at) and users
    const threads = threadsDb.prepare('SELECT id, user_id, created_at FROM threads').all();
    const users = usersDb.prepare('SELECT id FROM users').all();
    const userIds = users.map(u => u.id);

    const insertReply = repliesDb.prepare(`
        INSERT INTO replies (thread_id, user_id, parent_reply_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    let totalReplies = 0;
    let stackedReplies = 0;

    const generateAllReplies = repliesDb.transaction(() => {
        for (const thread of threads) {
            // Each thread gets 0-6 top-level replies
            const numTopLevelReplies = Math.floor(Math.random() * 7);
            if (numTopLevelReplies === 0) continue;

            // Select random users to reply (excluding thread author for variety)
            const otherUsers = userIds.filter(id => id !== thread.user_id);
            const shuffledUsers = [...otherUsers].sort(() => Math.random() - 0.5);
            const repliers = shuffledUsers.slice(0, Math.min(numTopLevelReplies + 5, shuffledUsers.length));

            const topLevelReplyIds = [];

            // Parse thread creation time
            const threadTime = new Date(thread.created_at);

            // Generate top-level replies (starting new cards)
            for (let i = 0; i < numTopLevelReplies; i++) {
                const userId = repliers[i % repliers.length];
                const content = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

                // Random time AFTER thread creation (1 hour to 5 days later)
                const hoursAfterThread = Math.floor(Math.random() * 119) + 1; // 1-120 hours (5 days)
                const baseTime = new Date(threadTime.getTime() + hoursAfterThread * 60 * 60 * 1000);
                const timestamp = baseTime.toISOString().replace('T', ' ').substring(0, 19);

                const result = insertReply.run(thread.id, userId, null, content, timestamp);
                topLevelReplyIds.push({ id: Number(result.lastInsertRowid), userId, timestamp: baseTime });
                totalReplies++;
            }

            // Generate stacked replies (replies to existing replies within same card)
            // 50% chance for each top-level reply to get 1-3 stacked replies
            for (const topReply of topLevelReplyIds) {
                if (Math.random() < 0.5) continue;

                const numStackedReplies = Math.floor(Math.random() * 3) + 1;
                let lastReplyId = topReply.id;
                let lastReplyUserId = topReply.userId;
                let lastReplyTime = topReply.timestamp;

                for (let j = 0; j < numStackedReplies; j++) {
                    // Pick a random user (could be thread author replying back, or another user)
                    const availableUsers = [...repliers, thread.user_id].filter(id => id !== lastReplyUserId);
                    const userId = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                    const content = sampleReplyToReplies[Math.floor(Math.random() * sampleReplyToReplies.length)];

                    // Timestamp AFTER the parent reply (1-48 hours later)
                    const hoursLater = Math.floor(Math.random() * 47) + 1;
                    const replyTime = new Date(lastReplyTime.getTime() + hoursLater * 60 * 60 * 1000);
                    const timestamp = replyTime.toISOString().replace('T', ' ').substring(0, 19);

                    const result = insertReply.run(thread.id, userId, lastReplyId, content, timestamp);
                    lastReplyId = Number(result.lastInsertRowid);
                    lastReplyUserId = userId;
                    lastReplyTime = replyTime;
                    totalReplies++;
                    stackedReplies++;
                }
            }
        }
    });

    generateAllReplies();

    console.log(`   ${totalReplies} replies created.`);
    console.log(`   ${totalReplies - stackedReplies} top-level replies (new cards).`);
    console.log(`   ${stackedReplies} stacked replies (within cards).`);
}

function printSummary() {
    console.log('\n========== SEED COMPLETE ==========\n');

    const communityCount = communitiesDb.prepare('SELECT COUNT(*) as count FROM communities').get();
    const userCount = usersDb.prepare('SELECT COUNT(*) as count FROM users').get();
    const membershipCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_communities').get();
    const threadCount = threadsDb.prepare('SELECT COUNT(*) as count FROM threads').get();
    const threadCommunityCount = threadsDb.prepare('SELECT COUNT(*) as count FROM thread_communities').get();
    const replyCount = repliesDb.prepare('SELECT COUNT(*) as count FROM replies').get();
    const topLevelReplyCount = repliesDb.prepare('SELECT COUNT(*) as count FROM replies WHERE parent_reply_id IS NULL').get();

    console.log('Database Statistics:');
    console.log(`  Communities:            ${communityCount.count}`);
    console.log(`  Users:                  ${userCount.count}`);
    console.log(`  User-Community links:   ${membershipCount.count}`);
    console.log(`  Threads:                ${threadCount.count}`);
    console.log(`  Thread-Community links: ${threadCommunityCount.count}`);
    console.log(`  Replies:                ${replyCount.count}`);
    console.log(`    - Top-level (cards):  ${topLevelReplyCount.count}`);
    console.log(`    - Stacked:            ${replyCount.count - topLevelReplyCount.count}`);

    console.log('\nSample member counts:');
    const sampleCommunities = communitiesDb.prepare('SELECT name, member_count FROM communities LIMIT 5').all();
    for (const c of sampleCommunities) {
        console.log(`  ${c.name}: ${c.member_count} members`);
    }

    console.log('\nTest Login:');
    console.log('  Username: user001');
    console.log('  Password: Pass001!');
    console.log('\n====================================\n');
}

// ============ RUN ============

function main() {
    console.log('\n====================================');
    console.log('   P-LikeMe Database Seed Script');
    console.log('====================================\n');

    clearAllData();
    seedCommunities();
    seedUsers();
    const userCommunities = linkUsersToCommunities();
    generateThreads(userCommunities);
    generateReplies();
    printSummary();
}

main();
