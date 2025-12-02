/**
 * Database setup and initialization
 * Uses SQLite with better-sqlite3
 *
 * Four separate databases:
 * - communities.db: Community data
 * - users.db: User accounts
 * - threads.db: User threads/shares
 * - replies.db: Thread replies/comments
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database file paths
const communitiesDbPath = path.join(__dirname, 'db', 'communities.db');
const usersDbPath = path.join(__dirname, 'db', 'users.db');
const threadsDbPath = path.join(__dirname, 'db', 'threads.db');
const repliesDbPath = path.join(__dirname, 'db', 'replies.db');

// Create database connections
const communitiesDb = new Database(communitiesDbPath);
const usersDb = new Database(usersDbPath);
const threadsDb = new Database(threadsDbPath);
const repliesDb = new Database(repliesDbPath);

// Enable WAL mode for better performance
communitiesDb.pragma('journal_mode = WAL');
usersDb.pragma('journal_mode = WAL');
threadsDb.pragma('journal_mode = WAL');
repliesDb.pragma('journal_mode = WAL');

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

    // Add profile columns if they don't exist
    const columns = usersDb.prepare("PRAGMA table_info(users)").all().map(c => c.name);

    if (!columns.includes('gender')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN gender TEXT`);
    }
    if (!columns.includes('age')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN age INTEGER`);
    }
    if (!columns.includes('profession')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN profession TEXT`);
    }
    if (!columns.includes('marriage_status')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN marriage_status TEXT`);
    }
    if (!columns.includes('location_from')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN location_from TEXT`);
    }
    if (!columns.includes('location_living')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN location_living TEXT`);
    }
    if (!columns.includes('income_individual')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN income_individual TEXT`);
    }
    if (!columns.includes('income_family')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN income_family TEXT`);
    }
    if (!columns.includes('family_size')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN family_size INTEGER`);
    }
    if (!columns.includes('hukou')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN hukou TEXT`);
    }
    if (!columns.includes('education')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN education TEXT`);
    }
    if (!columns.includes('consumption_level')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN consumption_level TEXT`);
    }
    if (!columns.includes('housing_status')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN housing_status TEXT`);
    }
    if (!columns.includes('economic_dependency')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN economic_dependency TEXT`);
    }
    if (!columns.includes('location_living_district')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN location_living_district TEXT`);
    }
    if (!columns.includes('location_living_street')) {
        usersDb.exec(`ALTER TABLE users ADD COLUMN location_living_street TEXT`);
    }

    // Junction table for user-community membership
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS user_communities (
            user_id INTEGER NOT NULL,
            community_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, community_id)
        )
    `);

    // Table for user disease tags (conditions they care about)
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS user_disease_tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            tag TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, tag)
        )
    `);

    // Table for user hospital tags
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS user_hospitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            hospital TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, hospital)
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

// ============ User Profile Functions ============

// Get user profile by ID (public view - excludes password)
function getUserProfile(user_id) {
    const user = usersDb.prepare(`
        SELECT id, username, gender, age, profession, marriage_status,
               location_from, location_living, location_living_district, location_living_street,
               income_individual, income_family, family_size, hukou, education,
               consumption_level, housing_status, economic_dependency, created_at
        FROM users WHERE id = ?
    `).get(user_id);

    if (!user) return null;

    // Get disease tags
    const diseaseTags = usersDb.prepare(`
        SELECT tag FROM user_disease_tags WHERE user_id = ?
    `).all(user_id).map(row => row.tag);

    // Get hospitals
    const hospitals = usersDb.prepare(`
        SELECT hospital FROM user_hospitals WHERE user_id = ?
    `).all(user_id).map(row => row.hospital);

    // Get joined communities
    const communityIds = getUserCommunityIds(user_id);
    let communities = [];
    if (communityIds.length > 0) {
        const placeholders = communityIds.map(() => '?').join(',');
        communities = communitiesDb.prepare(`
            SELECT id, name FROM communities WHERE id IN (${placeholders})
        `).all(...communityIds);
    }

    return {
        ...user,
        disease_tags: diseaseTags,
        hospitals: hospitals,
        communities: communities
    };
}

// Update user profile
function updateUserProfile(user_id, {
    gender, age, profession, marriage_status, location_from, location_living,
    location_living_district, location_living_street,
    income_individual, income_family, family_size, hukou, education,
    consumption_level, housing_status, economic_dependency,
    disease_tags, hospitals
}) {
    const updateUser = usersDb.prepare(`
        UPDATE users
        SET gender = @gender, age = @age, profession = @profession,
            marriage_status = @marriage_status, location_from = @location_from,
            location_living = @location_living, location_living_district = @location_living_district,
            location_living_street = @location_living_street, income_individual = @income_individual,
            income_family = @income_family, family_size = @family_size, hukou = @hukou,
            education = @education, consumption_level = @consumption_level,
            housing_status = @housing_status, economic_dependency = @economic_dependency
        WHERE id = @user_id
    `);

    const deleteDiseaseTags = usersDb.prepare(`DELETE FROM user_disease_tags WHERE user_id = ?`);
    const insertDiseaseTag = usersDb.prepare(`INSERT OR IGNORE INTO user_disease_tags (user_id, tag) VALUES (?, ?)`);

    const deleteHospitals = usersDb.prepare(`DELETE FROM user_hospitals WHERE user_id = ?`);
    const insertHospital = usersDb.prepare(`INSERT OR IGNORE INTO user_hospitals (user_id, hospital) VALUES (?, ?)`);

    const updateAll = usersDb.transaction(() => {
        // Update basic profile fields
        updateUser.run({
            user_id,
            gender: gender || null,
            age: age || null,
            profession: profession || null,
            marriage_status: marriage_status || null,
            location_from: location_from || null,
            location_living: location_living || null,
            location_living_district: location_living_district || null,
            location_living_street: location_living_street || null,
            income_individual: income_individual || null,
            income_family: income_family || null,
            family_size: family_size || null,
            hukou: hukou || null,
            education: education || null,
            consumption_level: consumption_level || null,
            housing_status: housing_status || null,
            economic_dependency: economic_dependency || null
        });

        // Update disease tags
        deleteDiseaseTags.run(user_id);
        if (disease_tags && Array.isArray(disease_tags)) {
            for (const tag of disease_tags) {
                if (tag && tag.trim()) {
                    insertDiseaseTag.run(user_id, tag.trim());
                }
            }
        }

        // Update hospitals
        deleteHospitals.run(user_id);
        if (hospitals && Array.isArray(hospitals)) {
            for (const hospital of hospitals) {
                if (hospital && hospital.trim()) {
                    insertHospital.run(user_id, hospital.trim());
                }
            }
        }
    });

    updateAll();
    return getUserProfile(user_id);
}

// Get user by username (for profile page access)
function findUserByUsernamePublic(username) {
    return usersDb.prepare(`
        SELECT id, username, created_at FROM users WHERE username = ?
    `).get(username);
}

// Search users with filters
function searchUsers({
    community_ids, disease_tag, gender, age_min, age_max, location, location_district, location_street, hospital,
    hukou, education, income_individual, income_family, consumption_level,
    housing_status, economic_dependency,
    exclude_user, limit = 50, offset = 0
}) {
    // Start with all users who have some profile info
    let userIds = new Set();
    let hasFilter = false;

    // Filter by community membership
    if (community_ids && community_ids.length > 0) {
        hasFilter = true;
        const placeholders = community_ids.map(() => '?').join(',');
        const rows = usersDb.prepare(`
            SELECT DISTINCT user_id FROM user_communities WHERE community_id IN (${placeholders})
        `).all(...community_ids);

        const communityUserIds = new Set(rows.map(r => r.user_id));
        if (userIds.size === 0) {
            userIds = communityUserIds;
        } else {
            userIds = new Set([...userIds].filter(id => communityUserIds.has(id)));
        }
    }

    // Filter by disease tag (fuzzy match)
    if (disease_tag && disease_tag.trim()) {
        hasFilter = true;
        const searchTerm = `%${disease_tag.trim()}%`;
        const rows = usersDb.prepare(`
            SELECT DISTINCT user_id FROM user_disease_tags WHERE tag LIKE ?
        `).all(searchTerm);

        const diseaseUserIds = new Set(rows.map(r => r.user_id));
        if (userIds.size === 0 && !community_ids?.length) {
            userIds = diseaseUserIds;
        } else if (userIds.size > 0) {
            userIds = new Set([...userIds].filter(id => diseaseUserIds.has(id)));
        } else {
            userIds = diseaseUserIds;
        }
    }

    // Filter by hospital (fuzzy match)
    if (hospital && hospital.trim()) {
        hasFilter = true;
        const searchTerm = `%${hospital.trim()}%`;
        const rows = usersDb.prepare(`
            SELECT DISTINCT user_id FROM user_hospitals WHERE hospital LIKE ?
        `).all(searchTerm);

        const hospitalUserIds = new Set(rows.map(r => r.user_id));
        if (userIds.size === 0 && !community_ids?.length && !disease_tag?.trim()) {
            userIds = hospitalUserIds;
        } else if (userIds.size > 0) {
            userIds = new Set([...userIds].filter(id => hospitalUserIds.has(id)));
        } else {
            userIds = hospitalUserIds;
        }
    }

    // Build SQL conditions for user table filters
    let conditions = [];
    let params = [];

    if (gender && gender.trim()) {
        hasFilter = true;
        conditions.push('gender = ?');
        params.push(gender.trim());
    }

    if (age_min !== undefined && age_min !== null && age_min !== '') {
        hasFilter = true;
        conditions.push('age >= ?');
        params.push(parseInt(age_min));
    }

    if (age_max !== undefined && age_max !== null && age_max !== '') {
        hasFilter = true;
        conditions.push('age <= ?');
        params.push(parseInt(age_max));
    }

    if (location && location.trim()) {
        hasFilter = true;
        const searchTerm = `%${location.trim()}%`;
        conditions.push('(location_from LIKE ? OR location_living LIKE ?)');
        params.push(searchTerm, searchTerm);
    }

    if (location_district && location_district.trim()) {
        hasFilter = true;
        const searchTerm = `%${location_district.trim()}%`;
        conditions.push('location_living_district LIKE ?');
        params.push(searchTerm);
    }

    if (location_street && location_street.trim()) {
        hasFilter = true;
        const searchTerm = `%${location_street.trim()}%`;
        conditions.push('location_living_street LIKE ?');
        params.push(searchTerm);
    }

    if (hukou && hukou.trim()) {
        hasFilter = true;
        conditions.push('hukou = ?');
        params.push(hukou.trim());
    }

    if (education && education.trim()) {
        hasFilter = true;
        conditions.push('education = ?');
        params.push(education.trim());
    }

    if (income_individual && income_individual.trim()) {
        hasFilter = true;
        conditions.push('income_individual = ?');
        params.push(income_individual.trim());
    }

    if (income_family && income_family.trim()) {
        hasFilter = true;
        conditions.push('income_family = ?');
        params.push(income_family.trim());
    }

    if (consumption_level && consumption_level.trim()) {
        hasFilter = true;
        conditions.push('consumption_level = ?');
        params.push(consumption_level.trim());
    }

    if (housing_status && housing_status.trim()) {
        hasFilter = true;
        conditions.push('housing_status = ?');
        params.push(housing_status.trim());
    }

    if (economic_dependency && economic_dependency.trim()) {
        hasFilter = true;
        conditions.push('economic_dependency = ?');
        params.push(economic_dependency.trim());
    }

    // Exclude specific user (for auto-find, to not include self)
    if (exclude_user && exclude_user.trim()) {
        conditions.push('username != ?');
        params.push(exclude_user.trim());
    }

    // If no filters, return empty (don't return all users)
    if (!hasFilter) {
        return { users: [], total: 0 };
    }

    // Build final query
    let sql = `SELECT id, username, gender, age, profession, marriage_status,
               location_from, location_living, location_living_district, location_living_street,
               hukou, education, income_individual, income_family, family_size,
               consumption_level, housing_status, economic_dependency, created_at FROM users WHERE 1=1`;

    // Add user ID filter if we filtered by communities/tags/hospitals
    if (userIds.size > 0) {
        const idPlaceholders = [...userIds].map(() => '?').join(',');
        sql += ` AND id IN (${idPlaceholders})`;
        params = [...userIds, ...params];
    } else if (community_ids?.length || disease_tag?.trim() || hospital?.trim()) {
        // If we had these filters but no matches, return empty
        return { users: [], total: 0 };
    }

    // Add other conditions
    if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
    }

    // Get total count (use [\s\S]* to match across newlines)
    const countSql = sql.replace(/SELECT [\s\S]* FROM/, 'SELECT COUNT(*) as count FROM');
    const totalResult = usersDb.prepare(countSql).get(...params);
    const total = totalResult ? totalResult.count : 0;

    // Add pagination
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const users = usersDb.prepare(sql).all(...params);

    // Enrich with communities, disease tags, and hospitals
    const enrichedUsers = users.map(user => {
        const communityIds = getUserCommunityIds(user.id);
        let communities = [];
        if (communityIds.length > 0) {
            const placeholders = communityIds.map(() => '?').join(',');
            communities = communitiesDb.prepare(`
                SELECT id, name FROM communities WHERE id IN (${placeholders})
            `).all(...communityIds);
        }

        const diseaseTags = usersDb.prepare(`
            SELECT tag FROM user_disease_tags WHERE user_id = ?
        `).all(user.id).map(r => r.tag);

        const hospitals = usersDb.prepare(`
            SELECT hospital FROM user_hospitals WHERE user_id = ?
        `).all(user.id).map(r => r.hospital);

        return {
            ...user,
            communities,
            disease_tags: diseaseTags,
            hospitals
        };
    });

    return { users: enrichedUsers, total };
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

// ============ Replies Database ============

function initRepliesDb() {
    // Replies table - stores replies to threads
    // parent_reply_id: if null, it's a top-level reply (starts a new card)
    //                  if set, it's a reply to another reply (stacked in same card)
    repliesDb.exec(`
        CREATE TABLE IF NOT EXISTS replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            parent_reply_id INTEGER DEFAULT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create index for faster queries
    repliesDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_replies_thread_id ON replies(thread_id)
    `);

    const count = repliesDb.prepare('SELECT COUNT(*) as count FROM replies').get();
    console.log(`Replies DB: ${count.count} replies`);
}

// Create a new reply
function createReply({ thread_id, user_id, content, parent_reply_id = null }) {
    const stmt = repliesDb.prepare(`
        INSERT INTO replies (thread_id, user_id, parent_reply_id, content)
        VALUES (@thread_id, @user_id, @parent_reply_id, @content)
    `);
    const result = stmt.run({ thread_id, user_id, parent_reply_id, content });
    return result.lastInsertRowid;
}

// Get all replies for a thread (flat list, sorted by date)
function getRepliesByThreadId(thread_id) {
    return repliesDb.prepare(`
        SELECT * FROM replies
        WHERE thread_id = ?
        ORDER BY created_at ASC
    `).all(thread_id);
}

// Get a single reply by ID
function getReplyById(id) {
    return repliesDb.prepare('SELECT * FROM replies WHERE id = ?').get(id);
}

// Delete a reply (only by owner)
function deleteReply(id, user_id) {
    const result = repliesDb.prepare(`
        DELETE FROM replies WHERE id = ? AND user_id = ?
    `).run(id, user_id);
    return result.changes > 0;
}

// Delete all replies for a thread (used when deleting a thread)
function deleteRepliesByThreadId(thread_id) {
    const result = repliesDb.prepare(`
        DELETE FROM replies WHERE thread_id = ?
    `).run(thread_id);
    return result.changes;
}

// Get reply count for a thread
function getReplyCountByThreadId(thread_id) {
    const result = repliesDb.prepare(`
        SELECT COUNT(*) as count FROM replies WHERE thread_id = ?
    `).get(thread_id);
    return result.count;
}

// ============ Initialize ============

initCommunitiesDb();
initUsersDb();
initThreadsDb();
initRepliesDb();

// ============ Exports ============

module.exports = {
    // Database connections (for advanced use)
    communitiesDb,
    usersDb,
    threadsDb,
    repliesDb,
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
    // User profile functions
    getUserProfile,
    updateUserProfile,
    findUserByUsernamePublic,
    searchUsers,
    // Thread functions
    createThread,
    getThreadsByUserId,
    getThreadById,
    getThreadsByCommunityId,
    deleteThread,
    updateThread,
    // Reply functions
    createReply,
    getRepliesByThreadId,
    getReplyById,
    deleteReply,
    deleteRepliesByThreadId,
    getReplyCountByThreadId
};
