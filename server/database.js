/**
 * Database setup and initialization
 * Uses SQLite with better-sqlite3
 *
 * Three separate databases:
 * - communities.db: Community data
 * - users.db: User accounts
 * - threads.db: User threads/shares
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database file paths
const communitiesDbPath = path.join(__dirname, 'db', 'communities.db');
const usersDbPath = path.join(__dirname, 'db', 'users.db');
const threadsDbPath = path.join(__dirname, 'db', 'threads.db');

// Create database connections
const communitiesDb = new Database(communitiesDbPath);
const usersDb = new Database(usersDbPath);
const threadsDb = new Database(threadsDbPath);

// Enable WAL mode for better performance
communitiesDb.pragma('journal_mode = WAL');
usersDb.pragma('journal_mode = WAL');
threadsDb.pragma('journal_mode = WAL');

// ============ Communities Database ============

function initCommunitiesDb() {
    communitiesDb.exec(`
        CREATE TABLE IF NOT EXISTS communities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            keywords TEXT NOT NULL,
            member_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const count = communitiesDb.prepare('SELECT COUNT(*) as count FROM communities').get();

    if (count.count === 0) {
        console.log('Seeding initial community data...');
        seedCommunities();
    } else {
        console.log(`Communities DB: ${count.count} communities`);
    }
}

function seedCommunities() {
    const communities = [
        {
            name: '糖尿病',
            description: '分享血糖管理经验，交流饮食和运动心得，互相鼓励共同面对糖尿病。',
            keywords: '糖尿病 血糖 胰岛素 糖尿',
            member_count: 12580
        },
        {
            name: '高血压',
            description: '讨论血压控制方法，分享健康生活方式，一起守护心血管健康。',
            keywords: '高血压 血压 心血管 心脏',
            member_count: 9320
        },
        {
            name: '抑郁症',
            description: '在这里你不孤单。分享心路历程，获得理解与支持，一起走向阳光。',
            keywords: '抑郁症 抑郁 心理 情绪 焦虑 心理健康',
            member_count: 15890
        },
        {
            name: '乳腺癌',
            description: '抗癌路上，我们同行。分享治疗经验，传递希望与力量。',
            keywords: '乳腺癌 乳腺 癌症 肿瘤 化疗',
            member_count: 7450
        },
        {
            name: '关节炎',
            description: '交流关节养护知识，分享缓解疼痛的方法，提高生活质量。',
            keywords: '关节炎 关节 风湿 类风湿 骨骼',
            member_count: 6120
        },
        {
            name: '失眠症',
            description: '分享改善睡眠的方法，交流助眠技巧，一起找回安稳的夜晚。',
            keywords: '失眠症 失眠 睡眠 睡不着 入睡困难',
            member_count: 11200
        }
    ];

    const insert = communitiesDb.prepare(`
        INSERT INTO communities (name, description, keywords, member_count)
        VALUES (@name, @description, @keywords, @member_count)
    `);

    const insertMany = communitiesDb.transaction((items) => {
        for (const item of items) {
            insert.run(item);
        }
    });

    insertMany(communities);
    console.log('Seeded 6 communities.');
}

function getAllCommunities() {
    return communitiesDb.prepare('SELECT * FROM communities ORDER BY id').all();
}

function searchCommunities(query) {
    const searchTerm = `%${query}%`;
    return communitiesDb.prepare(`
        SELECT * FROM communities
        WHERE name LIKE ? OR description LIKE ? OR keywords LIKE ?
        ORDER BY member_count DESC
    `).all(searchTerm, searchTerm, searchTerm);
}

function getCommunityById(id) {
    return communitiesDb.prepare('SELECT * FROM communities WHERE id = ?').get(id);
}

// ============ Users Database ============

function initUsersDb() {
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Junction table for user-community membership
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS user_communities (
            user_id INTEGER NOT NULL,
            community_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, community_id)
        )
    `);

    const count = usersDb.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`Users DB: ${count.count} users`);
}

function createUser({ username, password_hash }) {
    const stmt = usersDb.prepare(`
        INSERT INTO users (username, password_hash)
        VALUES (@username, @password_hash)
    `);
    const result = stmt.run({ username, password_hash });
    return result.lastInsertRowid;
}

function findUserByUsername(username) {
    return usersDb.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function findUserById(id) {
    return usersDb.prepare('SELECT id, username, created_at FROM users WHERE id = ?').get(id);
}

function usernameExists(username) {
    const result = usersDb.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get(username);
    return result.count > 0;
}

// Join a community
function joinCommunity(user_id, community_id) {
    const stmt = usersDb.prepare(`
        INSERT OR IGNORE INTO user_communities (user_id, community_id)
        VALUES (?, ?)
    `);
    const result = stmt.run(user_id, community_id);

    // Update member_count in communities table
    if (result.changes > 0) {
        communitiesDb.prepare(`
            UPDATE communities SET member_count = member_count + 1 WHERE id = ?
        `).run(community_id);
    }

    return result.changes > 0;
}

// Leave a community
function leaveCommunity(user_id, community_id) {
    const stmt = usersDb.prepare(`
        DELETE FROM user_communities WHERE user_id = ? AND community_id = ?
    `);
    const result = stmt.run(user_id, community_id);

    // Update member_count in communities table
    if (result.changes > 0) {
        communitiesDb.prepare(`
            UPDATE communities SET member_count = member_count - 1 WHERE id = ?
        `).run(community_id);
    }

    return result.changes > 0;
}

// Get all community IDs a user has joined
function getUserCommunityIds(user_id) {
    return usersDb.prepare(`
        SELECT community_id FROM user_communities WHERE user_id = ?
    `).all(user_id).map(row => row.community_id);
}

// Get full community details for communities a user has joined
function getUserCommunities(user_id) {
    const communityIds = getUserCommunityIds(user_id);
    if (communityIds.length === 0) return [];

    const placeholders = communityIds.map(() => '?').join(',');
    return communitiesDb.prepare(`
        SELECT * FROM communities WHERE id IN (${placeholders})
    `).all(...communityIds);
}

// Check if user is member of a community
function isUserInCommunity(user_id, community_id) {
    const result = usersDb.prepare(`
        SELECT COUNT(*) as count FROM user_communities WHERE user_id = ? AND community_id = ?
    `).get(user_id, community_id);
    return result.count > 0;
}

// ============ Threads Database ============

function initThreadsDb() {
    // Threads table
    threadsDb.exec(`
        CREATE TABLE IF NOT EXISTS threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Junction table for thread-community many-to-many relationship
    threadsDb.exec(`
        CREATE TABLE IF NOT EXISTS thread_communities (
            thread_id INTEGER NOT NULL,
            community_id INTEGER NOT NULL,
            PRIMARY KEY (thread_id, community_id)
        )
    `);

    const count = threadsDb.prepare('SELECT COUNT(*) as count FROM threads').get();
    console.log(`Threads DB: ${count.count} threads`);
}

// Create a new thread with optional community links
function createThread({ user_id, title, content, community_ids = [] }) {
    const insertThread = threadsDb.prepare(`
        INSERT INTO threads (user_id, title, content)
        VALUES (@user_id, @title, @content)
    `);

    const insertCommunity = threadsDb.prepare(`
        INSERT INTO thread_communities (thread_id, community_id)
        VALUES (?, ?)
    `);

    const createWithCommunities = threadsDb.transaction(({ user_id, title, content, community_ids }) => {
        const result = insertThread.run({ user_id, title, content });
        const threadId = result.lastInsertRowid;

        for (const communityId of community_ids) {
            insertCommunity.run(threadId, communityId);
        }

        return threadId;
    });

    return createWithCommunities({ user_id, title, content, community_ids });
}

// Get all threads for a user
function getThreadsByUserId(user_id) {
    const threads = threadsDb.prepare(`
        SELECT * FROM threads
        WHERE user_id = ?
        ORDER BY created_at DESC
    `).all(user_id);

    // Get community IDs for each thread
    const getCommunityIds = threadsDb.prepare(`
        SELECT community_id FROM thread_communities WHERE thread_id = ?
    `);

    return threads.map(thread => ({
        ...thread,
        community_ids: getCommunityIds.all(thread.id).map(row => row.community_id)
    }));
}

// Get a single thread by ID
function getThreadById(id) {
    const thread = threadsDb.prepare('SELECT * FROM threads WHERE id = ?').get(id);
    if (!thread) return null;

    const community_ids = threadsDb.prepare(`
        SELECT community_id FROM thread_communities WHERE thread_id = ?
    `).all(id).map(row => row.community_id);

    return { ...thread, community_ids };
}

// Delete a thread (and its community links)
function deleteThread(id, user_id) {
    const deleteLinks = threadsDb.prepare('DELETE FROM thread_communities WHERE thread_id = ?');
    const deleteThread = threadsDb.prepare('DELETE FROM threads WHERE id = ? AND user_id = ?');

    const deleteWithLinks = threadsDb.transaction((id, user_id) => {
        deleteLinks.run(id);
        const result = deleteThread.run(id, user_id);
        return result.changes > 0;
    });

    return deleteWithLinks(id, user_id);
}

// Get threads by community ID with pagination
function getThreadsByCommunityId(community_id, limit = 10, offset = 0) {
    // Get thread IDs linked to this community
    const threadIds = threadsDb.prepare(`
        SELECT thread_id FROM thread_communities WHERE community_id = ?
    `).all(community_id).map(row => row.thread_id);

    if (threadIds.length === 0) {
        return { threads: [], total: 0 };
    }

    const placeholders = threadIds.map(() => '?').join(',');

    // Get total count
    const total = threadIds.length;

    // Get paginated threads
    const threads = threadsDb.prepare(`
        SELECT * FROM threads
        WHERE id IN (${placeholders})
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).all(...threadIds, limit, offset);

    // Get community IDs for each thread
    const getCommunityIds = threadsDb.prepare(`
        SELECT community_id FROM thread_communities WHERE thread_id = ?
    `);

    const threadsWithCommunities = threads.map(thread => ({
        ...thread,
        community_ids: getCommunityIds.all(thread.id).map(row => row.community_id)
    }));

    return { threads: threadsWithCommunities, total };
}

// Update a thread
function updateThread({ id, user_id, title, content, community_ids = [] }) {
    const updateThread = threadsDb.prepare(`
        UPDATE threads SET title = @title, content = @content
        WHERE id = @id AND user_id = @user_id
    `);

    const deleteLinks = threadsDb.prepare('DELETE FROM thread_communities WHERE thread_id = ?');
    const insertLink = threadsDb.prepare('INSERT INTO thread_communities (thread_id, community_id) VALUES (?, ?)');

    const updateWithCommunities = threadsDb.transaction(({ id, user_id, title, content, community_ids }) => {
        const result = updateThread.run({ id, user_id, title, content });
        if (result.changes === 0) return false;

        // Update community links
        deleteLinks.run(id);
        for (const communityId of community_ids) {
            insertLink.run(id, communityId);
        }
        return true;
    });

    return updateWithCommunities({ id, user_id, title, content, community_ids });
}

// ============ Initialize ============

initCommunitiesDb();
initUsersDb();
initThreadsDb();

// ============ Exports ============

module.exports = {
    // Database connections (for advanced use)
    communitiesDb,
    usersDb,
    threadsDb,
    // Community functions
    getAllCommunities,
    searchCommunities,
    getCommunityById,
    // User functions
    createUser,
    findUserByUsername,
    findUserById,
    usernameExists,
    // User-community membership functions
    joinCommunity,
    leaveCommunity,
    getUserCommunityIds,
    getUserCommunities,
    isUserInCommunity,
    // Thread functions
    createThread,
    getThreadsByUserId,
    getThreadById,
    getThreadsByCommunityId,
    deleteThread,
    updateThread
};
