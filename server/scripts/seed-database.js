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

const communitiesDb = new Database(communitiesDbPath);
const usersDb = new Database(usersDbPath);
const threadsDb = new Database(threadsDbPath);

// ============ SEED DATA ============

// 30 communities
const communities = [
    { name: '糖尿病', description: '分享血糖管理经验，交流饮食和运动心得，互相鼓励共同面对糖尿病。', keywords: '糖尿病 血糖 胰岛素 糖尿' },
    { name: '高血压', description: '讨论血压控制方法，分享健康生活方式，一起守护心血管健康。', keywords: '高血压 血压 心血管 心脏' },
    { name: '抑郁症', description: '在这里你不孤单。分享心路历程，获得理解与支持，一起走向阳光。', keywords: '抑郁症 抑郁 心理 情绪 焦虑 心理健康' },
    { name: '乳腺癌', description: '抗癌路上，我们同行。分享治疗经验，传递希望与力量。', keywords: '乳腺癌 乳腺 癌症 肿瘤 化疗' },
    { name: '关节炎', description: '交流关节养护知识，分享缓解疼痛的方法，提高生活质量。', keywords: '关节炎 关节 风湿 类风湿 骨骼' },
    { name: '失眠症', description: '分享改善睡眠的方法，交流助眠技巧，一起找回安稳的夜晚。', keywords: '失眠症 失眠 睡眠 睡不着 入睡困难' },
    { name: '焦虑症', description: '分享应对焦虑的方法，交流放松技巧，互相支持共同面对焦虑。', keywords: '焦虑症 焦虑 紧张 恐慌 心理' },
    { name: '帕金森病', description: '交流帕金森病的治疗经验，分享日常护理技巧，互相鼓励。', keywords: '帕金森 帕金森病 震颤 神经' },
    { name: '多发性硬化', description: '分享MS治疗经验，交流康复方法，一起面对挑战。', keywords: '多发性硬化 MS 神经系统 自身免疫' },
    { name: '类风湿关节炎', description: '交流类风湿治疗经验，分享缓解疼痛的方法，互相支持。', keywords: '类风湿 类风湿关节炎 关节 免疫' },
    { name: '纤维肌痛', description: '分享纤维肌痛的应对策略，交流缓解疼痛的经验。', keywords: '纤维肌痛 慢性疼痛 肌肉痛 疲劳' },
    { name: '克罗恩病', description: '交流克罗恩病的治疗经验，分享饮食建议，互相鼓励。', keywords: '克罗恩病 肠炎 消化道 炎症性肠病' },
    { name: '肺癌', description: '分享肺癌治疗经验，传递希望与力量，一起抗癌。', keywords: '肺癌 肺 癌症 肿瘤 化疗 放疗' },
    { name: '阿尔茨海默病', description: '为阿尔茨海默病患者及家属提供支持，分享护理经验。', keywords: '阿尔茨海默 老年痴呆 记忆 认知障碍' },
    { name: '甲状腺疾病', description: '交流甲状腺问题的治疗经验，分享健康管理方法。', keywords: '甲状腺 甲亢 甲减 甲状腺结节' },
    { name: '慢性疲劳综合征', description: '分享应对慢性疲劳的方法，交流恢复精力的技巧。', keywords: '慢性疲劳 疲劳综合征 CFS 疲惫' },
    { name: '偏头痛', description: '交流偏头痛的治疗方法，分享预防和缓解技巧。', keywords: '偏头痛 头痛 头疼 神经' },
    { name: '哮喘', description: '分享哮喘管理经验，交流用药和生活方式建议。', keywords: '哮喘 呼吸 气喘 过敏 肺' },
    { name: '银屑病', description: '交流银屑病的治疗经验，分享皮肤护理方法。', keywords: '银屑病 牛皮癣 皮肤 皮肤病' },
    { name: '癫痫', description: '分享癫痫控制经验，交流用药和生活建议，互相支持。', keywords: '癫痫 抽搐 神经 发作' },
    { name: '心脏病', description: '交流心脏病的预防和治疗经验，分享健康生活方式。', keywords: '心脏病 心脏 冠心病 心血管 心肌梗死' },
    { name: '肝病', description: '分享肝病治疗经验，交流保肝护肝的方法。', keywords: '肝病 肝炎 肝硬化 脂肪肝 乙肝' },
    { name: '肾病', description: '交流肾病治疗经验，分享饮食和生活管理建议。', keywords: '肾病 肾脏 肾炎 透析 尿毒症' },
    { name: '强直性脊柱炎', description: '分享强直性脊柱炎的治疗经验，交流康复方法。', keywords: '强直性脊柱炎 脊柱 背痛 关节' },
    { name: '双相情感障碍', description: '分享双相情感障碍的管理经验，互相理解与支持。', keywords: '双相 双相情感障碍 躁郁症 情绪 心理' },
    { name: '自闭症', description: '为自闭症患者及家属提供支持，分享成长经验。', keywords: '自闭症 自闭 ASD 发育障碍' },
    { name: 'ADHD多动症', description: '交流ADHD的管理方法，分享应对策略和技巧。', keywords: 'ADHD 多动症 注意力缺陷 专注' },
    { name: '痛风', description: '分享痛风的预防和治疗经验，交流饮食建议。', keywords: '痛风 尿酸 关节痛 痛风石' },
    { name: '骨质疏松', description: '交流骨质疏松的预防和治疗，分享补钙经验。', keywords: '骨质疏松 骨骼 骨折 钙 骨密度' },
    { name: '慢性肾病', description: '分享慢性肾病的管理经验，交流饮食和治疗建议。', keywords: '慢性肾病 肾功能 透析 肾脏' }
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

// ============ MAIN FUNCTIONS ============

function clearAllData() {
    console.log('Step 1: Clearing all data...');

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
    console.log('Step 2: Seeding 30 communities...');

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
    console.log('   30 communities created.');
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

function printSummary() {
    console.log('\n========== SEED COMPLETE ==========\n');

    const communityCount = communitiesDb.prepare('SELECT COUNT(*) as count FROM communities').get();
    const userCount = usersDb.prepare('SELECT COUNT(*) as count FROM users').get();
    const membershipCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_communities').get();
    const threadCount = threadsDb.prepare('SELECT COUNT(*) as count FROM threads').get();
    const threadCommunityCount = threadsDb.prepare('SELECT COUNT(*) as count FROM thread_communities').get();

    console.log('Database Statistics:');
    console.log(`  Communities:            ${communityCount.count}`);
    console.log(`  Users:                  ${userCount.count}`);
    console.log(`  User-Community links:   ${membershipCount.count}`);
    console.log(`  Threads:                ${threadCount.count}`);
    console.log(`  Thread-Community links: ${threadCommunityCount.count}`);

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
    printSummary();
}

main();
