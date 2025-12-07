/**
 * Complete Database Seed Script
 * Removes db folder, recreates it, and generates consistent test data
 *
 * Run: node server/scripts/seed-database.js
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Path to the db folder
const dbFolder = path.join(__dirname, '..', 'db');

// Step 0: Remove and recreate db folder
console.log('Removing existing db folder...');
if (fs.existsSync(dbFolder)) {
    fs.rmSync(dbFolder, { recursive: true, force: true });
    console.log('  ✓ Removed existing db folder');
} else {
    console.log('  ✓ No existing db folder found');
}

console.log('Creating fresh db folder...');
fs.mkdirSync(dbFolder, { recursive: true });
console.log('  ✓ Created db folder\n');

// Database connections
const communitiesDbPath = path.join(dbFolder, 'communities.db');
const usersDbPath = path.join(dbFolder, 'users.db');
const threadsDbPath = path.join(dbFolder, 'threads.db');
const repliesDbPath = path.join(dbFolder, 'replies.db');

const communitiesDb = new Database(communitiesDbPath);
const usersDb = new Database(usersDbPath);
const threadsDb = new Database(threadsDbPath);
const repliesDb = new Database(repliesDbPath);

// ============ TIME HELPERS ============

/**
 * Get current time in China Standard Time (UTC+8)
 * Returns a Date object adjusted to CST
 */
function getCSTNow() {
    const now = new Date();
    // Convert to CST (UTC+8)
    const cstOffset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    return new Date(utcTime + cstOffset);
}

/**
 * Format a Date object to SQLite datetime string in CST
 * @param {Date} date - Date object (assumed to be in CST or will be converted)
 * @returns {string} - Format: 'YYYY-MM-DD HH:MM:SS'
 */
function formatCSTTimestamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get a CST timestamp for a time in the past
 * @param {number} daysAgo - Days before now
 * @param {number} hoursAgo - Additional hours before now
 * @returns {string} - SQLite datetime string
 */
function getCSTTimestampPast(daysAgo = 0, hoursAgo = 0) {
    const cstNow = getCSTNow();
    const pastTime = new Date(cstNow.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);
    return formatCSTTimestamp(pastTime);
}

/**
 * Get a CST timestamp for a time after a base time
 * @param {Date} baseTime - Base time
 * @param {number} hoursAfter - Hours after base time
 * @returns {object} - { timestamp: string, date: Date }
 */
function getCSTTimestampAfter(baseTime, hoursAfter) {
    const laterTime = new Date(baseTime.getTime() + hoursAfter * 60 * 60 * 1000);
    return {
        timestamp: formatCSTTimestamp(laterTime),
        date: laterTime
    };
}

// ============ SEED DATA ============

// 15 female-focused health communities with optional dimension metadata
// Dimensions allow hierarchical sub-communities (Level II and Level III)
const communities = [
    {
        name: '乳腺癌',
        description: '抗癌路上，我们同行。分享乳腺癌治疗经验，传递希望与力量。',
        dimensions: JSON.stringify({
            stage: { label: '分期', values: ['0期', 'I期', 'II期', 'III期', 'IV期'] },
            type: { label: '分子分型', values: ['Luminal A型', 'Luminal B型', 'HER2阳性型', '三阴性'] }
        })
    },
    {
        name: '宫颈癌',
        description: '分享宫颈癌防治经验，交流治疗心得，互相支持共同面对。',
        dimensions: JSON.stringify({
            stage: { label: '分期', values: ['I期', 'II期', 'III期', 'IV期'] },
            type: { label: 'HPV分型', values: ['高危型', '低危型'] }
        })
    },
    { name: '卵巢癌', description: '分享卵巢癌治疗经验，传递希望与力量，抗癌路上我们同行。', dimensions: null },
    { name: '子宫内膜癌', description: '交流子宫内膜癌的治疗经验，分享康复心得，互相支持。', dimensions: null },
    { name: '心血管疾病', description: '关注女性心血管健康，分享预防和治疗经验，守护心脏健康。', dimensions: null },
    { name: '脑卒中', description: '分享脑卒中预防和康复经验，交流治疗心得，互相鼓励。', dimensions: null },
    {
        name: '糖尿病',
        description: '分享血糖管理经验，交流饮食和运动心得，互相鼓励共同面对糖尿病。',
        dimensions: JSON.stringify({
            type: { label: '分型', values: ['1型糖尿病', '2型糖尿病', '妊娠期糖尿病', '特殊类型糖尿病'] }
        })
    },
    { name: '阿尔茨海默症', description: '为阿尔茨海默症患者及家属提供支持，分享护理经验和应对方法。', dimensions: null },
    {
        name: '子宫内膜异位症',
        description: '分享子宫内膜异位症的治疗经验，交流缓解疼痛的方法，互相鼓励。',
        dimensions: JSON.stringify({
            stage: { label: '分期', values: ['I期（轻微）', 'II期（轻度）', 'III期（中度）', 'IV期（重度）'] }
        })
    },
    { name: '子宫肌瘤', description: '交流子宫肌瘤的治疗方案，分享康复经验，互相支持。', dimensions: null },
    { name: '经前综合征', description: '分享缓解经前综合征的方法，交流调理经验，互相理解与支持。', dimensions: null },
    {
        name: '不孕症',
        description: '分享备孕和治疗经验，交流心路历程，互相鼓励共同面对不孕困扰。',
        dimensions: JSON.stringify({
            type: { label: '类型', values: ['原发性不孕', '继发性不孕'] }
        })
    },
    { name: '性传播感染', description: '分享性传播感染的防治知识，交流治疗经验，消除偏见互相支持。', dimensions: null },
    {
        name: '抑郁症',
        description: '在这里你不孤单。分享心路历程，获得理解与支持，一起走向阳光。',
        dimensions: JSON.stringify({
            type: { label: '严重程度', values: ['轻度', '中度', '重度'] }
        })
    },
    {
        name: '焦虑症',
        description: '分享应对焦虑的方法，交流放松技巧，互相支持共同面对焦虑。',
        dimensions: JSON.stringify({
            type: { label: '类型', values: ['广泛性焦虑症', '社交焦虑症', '惊恐障碍'] }
        })
    }
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

// Sample guru questions
const sampleGuruQuestionTitles = [
    '请问您当时是怎么发现的？',
    '治疗过程中有什么需要特别注意的吗？',
    '饮食方面有什么建议？',
    '运动方面应该注意什么？',
    '怎么调节心态？',
    '家人应该怎么配合？',
    '复查频率是怎样的？',
    '有没有推荐的医院或医生？',
    '副作用是怎么应对的？',
    '日常生活有什么改变？'
];

const sampleGuruQuestionContents = [
    '我最近刚确诊，心里很慌。想请教一下您当时是怎么发现问题的？有什么早期症状吗？',
    '马上要开始治疗了，有些紧张。想问问您在治疗过程中有什么需要特别注意的事项吗？',
    '医生说要注意饮食，但具体应该怎么吃呢？有没有什么食物是一定要避免的？',
    '我平时喜欢运动，确诊后不知道还能不能继续。请问运动方面有什么建议吗？',
    '最近心情很低落，看到您分享的经历很受鼓舞。想请教您是怎么调整心态的？',
    '家人都很担心我，有时候反而给我压力。请问您觉得家人应该怎么配合比较好？',
    '治疗结束后需要定期复查吗？一般多久查一次？主要查什么项目？',
    '您是在哪家医院治疗的？能推荐一下吗？或者有没有认识的好医生？',
    '听说治疗会有一些副作用，想问问您是怎么应对的？有没有什么缓解的方法？',
    '想知道确诊后您的日常生活有什么改变？作息、工作这些方面呢？'
];

const sampleGuruQuestionReplies = [
    '谢谢你的问题。根据我的经验...',
    '这是个很好的问题！我建议...',
    '我当时也有同样的困惑。后来发现...',
    '你的担心是很正常的。我的建议是...',
    '这个问题我来详细说说...',
    '根据我的亲身经历...',
    '首先，不要太焦虑。关于这个问题...',
    '我来分享一下我的做法...'
];

// Profile data for users
const genders = ['女', '女', '女', '女', '男', '其他']; // Weighted towards female

const professions = [
    '教师', '医生', '护士', '工程师', '设计师', '会计', '销售',
    '公务员', '自由职业', '企业管理', '学生', '退休', '家庭主妇',
    '律师', '记者', '程序员', '人力资源', '金融', '市场营销'
];

const marriageStatuses = ['未婚', '已婚', '已婚', '已婚', '离异', '丧偶']; // Weighted towards married

// 现居城市 (location_living) - major cities where people currently live
const livingCities = [
    '北京市', '上海市', '广州市', '深圳市', '杭州市', '南京市', '武汉市', '成都市',
    '西安市', '重庆市', '天津市', '苏州市', '长沙市', '郑州市', '青岛市', '大连市',
    '厦门市', '福州市', '济南市', '合肥市', '昆明市', '贵阳市', '南昌市', '太原市'
];

// 家乡 (location_from) - hometowns including provinces, smaller cities, counties
const hometowns = [
    // 省份
    '山东', '河南', '四川', '江苏', '河北', '湖南', '安徽', '湖北',
    '浙江', '广东', '云南', '江西', '福建', '山西', '陕西', '贵州',
    '辽宁', '黑龙江', '吉林', '甘肃', '内蒙古', '新疆', '广西', '海南',
    // 地级市
    '临沂', '潍坊', '烟台', '洛阳', '南阳', '邯郸', '保定', '周口',
    '徐州', '温州', '泉州', '赣州', '宜昌', '襄阳', '绵阳', '南充',
    '常德', '岳阳', '株洲', '九江', '上饶', '宿迁', '淮安', '连云港',
    // 县级市/县
    '沭阳', '义乌', '慈溪', '诸暨', '海宁', '桐乡', '瑞安', '乐清',
    '晋江', '石狮', '南安', '邳州', '启东', '如皋', '海门', '太仓',
    '宜兴', '邓州', '汝州', '项城', '禹州', '长葛', '灵宝', '偃师'
];

const hospitals = [
    '北京协和医院', '北京大学人民医院', '中国医学科学院肿瘤医院',
    '上海交通大学医学院附属瑞金医院', '复旦大学附属中山医院', '复旦大学附属肿瘤医院',
    '浙江大学医学院附属第一医院', '浙江省肿瘤医院',
    '中山大学附属第一医院', '广东省人民医院', '广州医科大学附属第一医院',
    '四川大学华西医院', '华中科技大学同济医学院附属同济医院',
    '西安交通大学第一附属医院', '天津医科大学总医院',
    '南京鼓楼医院', '江苏省人民医院', '山东省立医院',
    '中南大学湘雅医院', '郑州大学第一附属医院'
];

const diseaseTags = [
    '乳腺癌', '宫颈癌', '卵巢癌', '子宫内膜癌',
    '糖尿病', '高血压', '心脏病', '脑卒中',
    '子宫内膜异位症', '子宫肌瘤', '多囊卵巢', '经前综合征',
    '不孕症', '试管婴儿', '备孕',
    '抑郁症', '焦虑症', '失眠', '产后抑郁',
    '甲状腺结节', '骨质疏松', '更年期综合征',
    'HPV感染', '乳腺增生', '乳腺结节'
];

// Guru intro samples (multi-line)
const guruIntros = [
    '作为一名乳腺癌康复者，我经历了从确诊到治疗再到康复的全过程。\n\n希望能用我的经验帮助更多正在经历同样困境的姐妹们。在这里，你可以问我任何关于治疗、康复、心态调整的问题。',
    '我是一名内分泌科医生，同时也是糖尿病患者。双重身份让我更能理解病友们的处境。\n\n欢迎大家向我咨询血糖管理、饮食控制、运动方案等方面的问题。',
    '从抑郁症走出来已经三年了。这段经历让我更加珍惜生活，也让我想要帮助更多还在黑暗中的朋友。\n\n如果你正在经历困难，请相信，隧道的尽头一定有光。',
    '作为试管婴儿成功的过来人，我深知这条路的艰辛。三次促排，两次移植，终于迎来了我的宝宝。\n\n如果你正在备孕路上，有任何疑问都可以问我。',
    '子宫内膜异位症让我痛苦了十多年，尝试过各种治疗方法。现在终于找到了适合自己的方案。\n\n希望我的经验能帮助到正在寻找出路的你。',
    '确诊宫颈癌的那一刻，我以为人生就此结束。但现在回头看，那只是一个新的开始。\n\n五年抗癌路，我学会了很多，也愿意把这些分享给需要的人。',
    '作为焦虑症患者，我曾经连门都不敢出。通过系统的治疗和自我调节，现在的我已经能够正常生活工作。\n\n如果你也在与焦虑斗争，欢迎来找我聊聊。',
    '心血管疾病让我不得不改变整个生活方式。但这也让我变得更加健康。\n\n现在我想把这些年积累的心血管健康知识分享给大家。'
];

// New profile fields
const hukouTypes = ['城镇', '城镇', '城镇', '农村', '农村']; // Weighted towards urban

const educationLevels = [
    '小学及以下', '初中', '初中', '高中/中专', '高中/中专',
    '大专', '大专', '本科', '本科', '本科', '硕士', '博士及以上'
]; // Weighted towards higher education

const incomeIndividualLevels = [
    '5万以下', '5万以下', '5-10万', '5-10万', '5-10万',
    '10-20万', '10-20万', '20-50万', '50-100万', '100万以上'
];

const incomeFamilyLevels = [
    '10万以下', '10万以下', '10-20万', '10-20万', '20-50万',
    '20-50万', '50-100万', '100-200万', '200万以上'
];

const consumptionLevels = ['节俭型', '普通型', '普通型', '中等型', '中等型', '较高型', '高消费型'];

const housingStatuses = [
    '自有住房(无贷款)', '自有住房(有贷款)', '自有住房(有贷款)',
    '租房', '租房', '与父母同住', '单位宿舍', '其他'
];

const economicDependencyLevels = [
    '完全独立', '完全独立', '基本独立', '基本独立', '主要依赖家人'
];

const fertilityStatuses = [
    '未育', '未育', '未育', '已育一孩', '已育一孩', '已育一孩',
    '已育两孩', '已育两孩', '已育三孩及以上', '不打算生育', '正在备孕'
]; // Weighted distribution

// Districts by city (for location_living_district)
const districtsByCity = {
    '北京市': ['朝阳区', '海淀区', '东城区', '西城区', '丰台区', '通州区', '大兴区', '顺义区'],
    '上海市': ['浦东新区', '黄浦区', '静安区', '徐汇区', '长宁区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区'],
    '广州市': ['天河区', '越秀区', '海珠区', '荔湾区', '白云区', '番禺区', '黄埔区'],
    '深圳市': ['福田区', '南山区', '罗湖区', '宝安区', '龙岗区', '龙华区'],
    '杭州市': ['上城区', '下城区', '西湖区', '拱墅区', '滨江区', '余杭区', '萧山区'],
    '成都市': ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '高新区'],
    '南京市': ['玄武区', '秦淮区', '鼓楼区', '建邺区', '栖霞区', '江宁区'],
    '武汉市': ['武昌区', '洪山区', '江汉区', '硚口区', '汉阳区', '青山区'],
    '西安市': ['新城区', '碑林区', '莲湖区', '雁塔区', '未央区', '灞桥区'],
    '天津市': ['和平区', '河西区', '南开区', '河东区', '河北区', '滨海新区'],
    '重庆市': ['渝中区', '江北区', '南岸区', '渝北区', '沙坪坝区', '九龙坡区']
};

// Sample streets/communities
const sampleStreets = [
    '建国路街道', '朝外街道', '三里屯街道', '望京街道', '劲松街道',
    '陆家嘴街道', '南京东路街道', '静安寺街道', '徐家汇街道', '虹桥街道',
    '珠江新城街道', '沙面街道', '五山街道', '石牌街道', '天河南街道',
    '华强北街道', '南头街道', '福田街道', '华侨城社区', '蛇口街道',
    '西溪街道', '文新街道', '翠苑街道', '古荡街道', '留下街道',
    '春熙路街道', '双桥子街道', '柳江街道', '火车南站街道', '机投桥街道'
];

// ============ MAIN FUNCTIONS ============

function initDb() {
    console.log('Step 0: Initializing database tables...');

    // Communities table (with dimensions for hierarchical sub-communities)
    communitiesDb.exec(`
        CREATE TABLE IF NOT EXISTS communities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            member_count INTEGER DEFAULT 0,
            dimensions TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Sub-community member counts table
    communitiesDb.exec(`
        CREATE TABLE IF NOT EXISTS sub_community_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            community_id INTEGER NOT NULL,
            stage TEXT DEFAULT '',
            type TEXT DEFAULT '',
            member_count INTEGER DEFAULT 0,
            UNIQUE (community_id, stage, type)
        )
    `);

    // Users table
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            gender TEXT,
            age INTEGER,
            profession TEXT,
            marriage_status TEXT,
            location_from TEXT,
            location_living TEXT,
            location_living_district TEXT,
            location_living_street TEXT,
            income_individual TEXT,
            income_family TEXT,
            family_size INTEGER,
            hukou TEXT,
            education TEXT,
            consumption_level TEXT,
            housing_status TEXT,
            economic_dependency TEXT,
            fertility_status TEXT,
            is_guru INTEGER DEFAULT 0,
            guru_intro TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Guru questions table
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS guru_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guru_user_id INTEGER NOT NULL,
            asker_user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            reply_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Guru question replies table
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS guru_question_replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            parent_reply_id INTEGER DEFAULT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User-community membership (with sub-community support)
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS user_communities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            community_id INTEGER NOT NULL,
            stage TEXT DEFAULT '',
            type TEXT DEFAULT '',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, community_id, stage, type)
        )
    `);

    // User disease history (actual diseases they have/had)
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS user_disease_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            community_id INTEGER,
            stage TEXT DEFAULT '',
            type TEXT DEFAULT '',
            disease TEXT NOT NULL,
            onset_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, community_id, stage, type, disease)
        )
    `);

    // User hospitals
    usersDb.exec(`
        CREATE TABLE IF NOT EXISTS user_hospitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            hospital TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Threads table
    threadsDb.exec(`
        CREATE TABLE IF NOT EXISTS threads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            reply_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Thread-community links (with sub-community support)
    threadsDb.exec(`
        CREATE TABLE IF NOT EXISTS thread_communities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id INTEGER NOT NULL,
            community_id INTEGER NOT NULL,
            stage TEXT DEFAULT '',
            type TEXT DEFAULT '',
            UNIQUE (thread_id, community_id, stage, type)
        )
    `);

    // Replies table
    repliesDb.exec(`
        CREATE TABLE IF NOT EXISTS replies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thread_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            parent_reply_id INTEGER,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('   All tables initialized.');
}

function seedCommunities() {
    console.log('Step 1: Seeding 15 communities...');

    const insert = communitiesDb.prepare(`
        INSERT INTO communities (name, description, member_count, dimensions)
        VALUES (@name, @description, 0, @dimensions)
    `);

    const insertMany = communitiesDb.transaction((items) => {
        for (const item of items) {
            insert.run({
                name: item.name,
                description: item.description,
                dimensions: item.dimensions || null
            });
        }
    });

    insertMany(communities);

    // Count communities with dimensions
    const withDimensions = communities.filter(c => c.dimensions).length;
    console.log(`   15 communities created (${withDimensions} with sub-community dimensions).`);
}

function seedUsers() {
    console.log('Step 2: Seeding 100 test users with profile data...');

    // Get communities from DB with IDs
    const dbCommunities = communitiesDb.prepare('SELECT id, name FROM communities').all();

    const insertUser = usersDb.prepare(`
        INSERT INTO users (username, password_hash, gender, age, profession, marriage_status,
            location_from, location_living, location_living_district, location_living_street,
            income_individual, income_family, family_size, hukou, education,
            consumption_level, housing_status, economic_dependency, fertility_status, is_guru, guru_intro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Randomly select 8 users to be gurus (user IDs 5, 12, 23, 34, 45, 56, 67, 78)
    const guruUserNumbers = [5, 12, 23, 34, 45, 56, 67, 78];

    const insertDiseaseHistory = usersDb.prepare(`
        INSERT INTO user_disease_history (user_id, community_id, stage, type, disease, onset_date) VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Helper to generate random onset date (1-120 months ago from today)
    const generateOnsetDate = () => {
        const monthsAgo = Math.floor(Math.random() * 120) + 1; // 1 to 120 months ago
        const now = new Date();
        now.setMonth(now.getMonth() - monthsAgo);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const insertHospital = usersDb.prepare(`
        INSERT INTO user_hospitals (user_id, hospital) VALUES (?, ?)
    `);

    // Helper to pick random item from array
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Helper to pick random N items from array
    const pickRandomN = (arr, n) => {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
    };

    const generateUsers = usersDb.transaction(() => {
        for (let i = 1; i <= 100; i++) {
            const paddedNum = String(i).padStart(3, '0');
            const username = `user${paddedNum}`;
            const password = `Pass${paddedNum}!`;
            const password_hash = bcrypt.hashSync(password, 10);

            // Generate profile data (higher probabilities for richer user profiles)
            const gender = Math.random() < 0.95 ? pickRandom(genders) : null;
            const age = Math.random() < 0.95 ? Math.floor(Math.random() * 50) + 20 : null; // 20-69
            const profession = Math.random() < 0.85 ? pickRandom(professions) : null;
            const marriage_status = Math.random() < 0.90 ? pickRandom(marriageStatuses) : null;
            const location_from = Math.random() < 0.85 ? pickRandom(hometowns) : null; // 家乡
            const location_living = Math.random() < 0.95 ? pickRandom(livingCities) : null; // 现居城市

            // Generate district and street based on location_living
            let location_living_district = null;
            let location_living_street = null;
            if (location_living && districtsByCity[location_living]) {
                location_living_district = Math.random() < 0.85 ? pickRandom(districtsByCity[location_living]) : null;
                location_living_street = Math.random() < 0.70 ? pickRandom(sampleStreets) : null;
            }

            // New profile fields (higher probabilities)
            const income_individual = Math.random() < 0.80 ? pickRandom(incomeIndividualLevels) : null;
            const income_family = Math.random() < 0.75 ? pickRandom(incomeFamilyLevels) : null;
            const family_size = Math.random() < 0.90 ? Math.floor(Math.random() * 6) + 1 : null; // 1-6
            const hukou = Math.random() < 0.85 ? pickRandom(hukouTypes) : null;
            const education = Math.random() < 0.90 ? pickRandom(educationLevels) : null;
            const consumption_level = Math.random() < 0.75 ? pickRandom(consumptionLevels) : null;
            const housing_status = Math.random() < 0.80 ? pickRandom(housingStatuses) : null;
            const economic_dependency = Math.random() < 0.75 ? pickRandom(economicDependencyLevels) : null;
            const fertility_status = Math.random() < 0.85 ? pickRandom(fertilityStatuses) : null;

            // Determine if this user is a guru
            const isGuru = guruUserNumbers.includes(i) ? 1 : 0;
            const guruIntro = isGuru ? pickRandom(guruIntros) : null;

            const result = insertUser.run(
                username, password_hash, gender, age, profession, marriage_status,
                location_from, location_living, location_living_district, location_living_street,
                income_individual, income_family, family_size, hukou, education,
                consumption_level, housing_status, economic_dependency, fertility_status, isGuru, guruIntro
            );
            const userId = Number(result.lastInsertRowid);

            // Add 1-5 disease history entries (90% chance to have at least one)
            // Use community-based diseases when possible, with Level II/III sub-community details
            if (Math.random() < 0.90) {
                const numDiseases = Math.floor(Math.random() * 5) + 1; // 1-5 diseases
                const userDiseases = pickRandomN(diseaseTags, numDiseases);
                for (const disease of userDiseases) {
                    // Try to match with a community from DB
                    const matchedCommunity = dbCommunities.find(c => c.name === disease);
                    if (matchedCommunity) {
                        // Find the community definition to get dimensions
                        const communityDef = communities.find(c => c.name === disease);
                        const dimensions = communityDef && communityDef.dimensions
                            ? JSON.parse(communityDef.dimensions)
                            : null;

                        let stage = '';
                        let type = '';
                        let displayName = disease;

                        if (dimensions) {
                            // 60% chance to pick a sub-level if dimensions exist
                            if (Math.random() < 0.6) {
                                const stages = dimensions.stage?.values || [];
                                const types = dimensions.type?.values || [];

                                if (stages.length > 0 && types.length > 0) {
                                    // Has both - 50% Level II (type only), 50% Level III (type + stage)
                                    type = pickRandom(types);
                                    if (Math.random() < 0.5) {
                                        stage = pickRandom(stages);
                                        displayName = `${disease} > ${type} · ${stage}`;
                                    } else {
                                        displayName = `${disease} > ${type}`;
                                    }
                                } else if (types.length > 0) {
                                    // Only type dimension
                                    type = pickRandom(types);
                                    displayName = `${disease} > ${type}`;
                                } else if (stages.length > 0) {
                                    // Only stage dimension
                                    stage = pickRandom(stages);
                                    displayName = `${disease} > ${stage}`;
                                }
                            }
                        }

                        // Community-based disease (with optional sub-community)
                        // Note: Disease history is independent from community membership
                        const onsetDate = generateOnsetDate();
                        insertDiseaseHistory.run(userId, matchedCommunity.id, stage, type, displayName, onsetDate);
                    } else {
                        // Free-text disease
                        const onsetDate = generateOnsetDate();
                        insertDiseaseHistory.run(userId, null, '', '', disease, onsetDate);
                    }
                }
            }

            // Add 1-3 hospitals (75% chance to have at least one)
            if (Math.random() < 0.75) {
                const numHospitals = Math.floor(Math.random() * 3) + 1; // 1-3 hospitals
                const userHospitals = pickRandomN(hospitals, numHospitals);
                for (const hospital of userHospitals) {
                    insertHospital.run(userId, hospital);
                }
            }
        }
    });

    generateUsers();

    const diseaseHistoryCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_disease_history').get();
    const hospitalCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_hospitals').get();

    const guruCount = usersDb.prepare('SELECT COUNT(*) as count FROM users WHERE is_guru = 1').get();

    console.log('   100 users created with profile data.');
    console.log(`   ${guruCount.count} users designated as gurus (明星).`);
    console.log(`   ${diseaseHistoryCount.count} disease history entries created.`);
    console.log(`   ${hospitalCount.count} hospital records created.`);
    console.log('   Username format: user001 to user100');
    console.log('   Password format: Pass001! to Pass100!');
}

function linkUsersToCommunities() {
    console.log('Step 3: Linking users to communities (independent from disease history)...');

    // Get all user IDs and communities (with dimensions)
    const users = usersDb.prepare('SELECT id FROM users').all();
    const allCommunities = communitiesDb.prepare('SELECT id, dimensions FROM communities').all();

    const insertMembership = usersDb.prepare(`
        INSERT OR IGNORE INTO user_communities (user_id, community_id, stage, type)
        VALUES (?, ?, ?, ?)
    `);

    const insertSubCommunityCount = communitiesDb.prepare(`
        INSERT INTO sub_community_members (community_id, stage, type, member_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT(community_id, stage, type)
        DO UPDATE SET member_count = member_count + 1
    `);

    // Helper to pick random item from array
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const linkUsers = usersDb.transaction(() => {
        let subCommunityJoins = 0;

        for (const user of users) {
            // Each user joins 3-8 random communities (independent from disease history)
            const numCommunities = Math.floor(Math.random() * 6) + 3; // 3-8

            const shuffled = [...allCommunities].sort(() => Math.random() - 0.5);
            const selectedCommunities = shuffled.slice(0, Math.min(numCommunities, shuffled.length));

            for (const community of selectedCommunities) {
                // Always join Level I (parent community)
                insertMembership.run(user.id, community.id, '', '');

                // If community has dimensions, 80% chance to join a sub-community
                if (community.dimensions && Math.random() < 0.80) {
                    const dims = JSON.parse(community.dimensions);
                    const hasStage = dims.stage && dims.stage.values;
                    const hasType = dims.type && dims.type.values;

                    let stage = '';
                    let type = '';

                    if (hasStage && hasType) {
                        // 2D matrix: randomly choose to join Level II, Level III, or both
                        const choice = Math.random();
                        if (choice < 0.3) {
                            // Join Level II (stage only)
                            stage = pickRandom(dims.stage.values);
                            insertMembership.run(user.id, community.id, stage, '');
                            insertSubCommunityCount.run(community.id, stage, '');
                            subCommunityJoins++;
                        } else if (choice < 0.5) {
                            // Join Level II (type only)
                            type = pickRandom(dims.type.values);
                            insertMembership.run(user.id, community.id, '', type);
                            insertSubCommunityCount.run(community.id, '', type);
                            subCommunityJoins++;
                        } else {
                            // Join Level III (both stage and type)
                            // Also join corresponding Level II communities (stage-only and type-only)
                            stage = pickRandom(dims.stage.values);
                            type = pickRandom(dims.type.values);

                            // Join Level II (stage-only)
                            insertMembership.run(user.id, community.id, stage, '');
                            insertSubCommunityCount.run(community.id, stage, '');
                            subCommunityJoins++;

                            // Join Level II (type-only)
                            insertMembership.run(user.id, community.id, '', type);
                            insertSubCommunityCount.run(community.id, '', type);
                            subCommunityJoins++;

                            // Join Level III
                            insertMembership.run(user.id, community.id, stage, type);
                            insertSubCommunityCount.run(community.id, stage, type);
                            subCommunityJoins++;
                        }
                    } else if (hasStage) {
                        // 1D: stage only
                        stage = pickRandom(dims.stage.values);
                        insertMembership.run(user.id, community.id, stage, '');
                        insertSubCommunityCount.run(community.id, stage, '');
                        subCommunityJoins++;
                    } else if (hasType) {
                        // 1D: type only
                        type = pickRandom(dims.type.values);
                        insertMembership.run(user.id, community.id, '', type);
                        insertSubCommunityCount.run(community.id, '', type);
                        subCommunityJoins++;
                    }
                }
            }
        }

        return subCommunityJoins;
    });

    const subCommunityJoins = linkUsers();

    // Update member_count for each community (Level I count only)
    console.log('   Updating member counts...');
    for (const community of allCommunities) {
        const count = usersDb.prepare(
            "SELECT COUNT(*) as count FROM user_communities WHERE community_id = ? AND stage = '' AND type = ''"
        ).get(community.id);

        communitiesDb.prepare(
            'UPDATE communities SET member_count = ? WHERE id = ?'
        ).run(count.count, community.id);
    }

    const membershipCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_communities').get();
    console.log(`   ${membershipCount.count} user-community links created.`);
    console.log(`   ${subCommunityJoins} additional sub-community memberships created.`);
}

function generateThreads() {
    console.log('Step 4: Generating threads (independent from user profiles)...');

    // Get all communities with their dimensions
    const allCommunities = communitiesDb.prepare('SELECT id, name, dimensions FROM communities').all();
    const allUsers = usersDb.prepare('SELECT id FROM users').all();

    const insertThread = threadsDb.prepare(`
        INSERT INTO threads (user_id, title, content, created_at)
        VALUES (?, ?, ?, ?)
    `);

    const insertThreadCommunity = threadsDb.prepare(`
        INSERT INTO thread_communities (thread_id, community_id, stage, type)
        VALUES (?, ?, ?, ?)
    `);

    // Helper functions
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pickRandomN = (arr, n) => {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(n, shuffled.length));
    };

    // Build all possible community options (Level I, II, III)
    const allCommunityOptions = [];
    for (const community of allCommunities) {
        // Level I (base)
        allCommunityOptions.push({ id: community.id, name: community.name, stage: '', type: '' });

        // Level II and III if dimensions exist
        if (community.dimensions) {
            const dims = JSON.parse(community.dimensions);
            const stages = dims.stage?.values || [];
            const types = dims.type?.values || [];

            // Stage-only options (Level II)
            for (const stage of stages) {
                allCommunityOptions.push({
                    id: community.id,
                    name: `${community.name} > ${stage}`,
                    stage,
                    type: ''
                });
            }

            // Type-only options (Level II)
            for (const type of types) {
                allCommunityOptions.push({
                    id: community.id,
                    name: `${community.name} > ${type}`,
                    stage: '',
                    type
                });
            }

            // Combined options (Level III)
            for (const stage of stages) {
                for (const type of types) {
                    allCommunityOptions.push({
                        id: community.id,
                        name: `${community.name} > ${stage} · ${type}`,
                        stage,
                        type
                    });
                }
            }
        }
    }

    const generateAllThreads = threadsDb.transaction(() => {
        let threadCount = 0;

        for (const user of allUsers) {
            // Each user creates 0-3 threads
            const numThreads = Math.floor(Math.random() * 4);

            for (let j = 0; j < numThreads; j++) {
                const title = sampleTitles[Math.floor(Math.random() * sampleTitles.length)];
                const content = sampleContents[Math.floor(Math.random() * sampleContents.length)];

                // Random time offset (0-30 days ago) in CST
                const daysAgo = Math.floor(Math.random() * 30);
                const hoursAgo = Math.floor(Math.random() * 24);
                const timestamp = getCSTTimestampPast(daysAgo, hoursAgo);

                const result = insertThread.run(user.id, title, content, timestamp);
                const threadId = Number(result.lastInsertRowid);
                threadCount++;

                // Link to 1-3 random communities (any community, not just user's joined ones)
                const numCommunityLinks = Math.floor(Math.random() * 3) + 1;
                const selectedCommunities = pickRandomN(allCommunityOptions, numCommunityLinks);

                for (const community of selectedCommunities) {
                    insertThreadCommunity.run(threadId, community.id, community.stage, community.type);
                }
            }
        }

        return { threadCount };
    });

    const { threadCount } = generateAllThreads();
    const threadCommunityCount = threadsDb.prepare('SELECT COUNT(*) as count FROM thread_communities').get();

    console.log(`   ${threadCount} threads created.`);
    console.log(`   ${threadCommunityCount.count} thread-community links created.`);
}

function generateReplies() {
    console.log('Step 5: Generating replies...');

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

            // Parse thread creation time (already in CST format from database)
            const threadTime = new Date(thread.created_at);

            // Generate top-level replies (starting new cards)
            for (let i = 0; i < numTopLevelReplies; i++) {
                const userId = repliers[i % repliers.length];
                const content = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

                // Random time AFTER thread creation (1 hour to 5 days later) in CST
                const hoursAfterThread = Math.floor(Math.random() * 119) + 1; // 1-120 hours (5 days)
                const { timestamp, date: baseTime } = getCSTTimestampAfter(threadTime, hoursAfterThread);

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

                    // Timestamp AFTER the parent reply (1-48 hours later) in CST
                    const hoursLater = Math.floor(Math.random() * 47) + 1;
                    const { timestamp, date: replyTime } = getCSTTimestampAfter(lastReplyTime, hoursLater);

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

    // Update reply_count for each thread
    console.log('   Updating thread reply counts...');
    const threadIds = threads.map(t => t.id);
    for (const threadId of threadIds) {
        const count = repliesDb.prepare('SELECT COUNT(*) as count FROM replies WHERE thread_id = ?').get(threadId);
        threadsDb.prepare('UPDATE threads SET reply_count = ? WHERE id = ?').run(count.count, threadId);
    }

    console.log(`   ${totalReplies} replies created.`);
    console.log(`   ${totalReplies - stackedReplies} top-level replies (new cards).`);
    console.log(`   ${stackedReplies} stacked replies (within cards).`);
}

function generateGuruQuestions() {
    console.log('Step 6: Generating guru questions and replies...');

    // Get all gurus and non-guru users
    const gurus = usersDb.prepare('SELECT id, username FROM users WHERE is_guru = 1').all();
    const nonGuruUsers = usersDb.prepare('SELECT id FROM users WHERE is_guru = 0').all();

    if (gurus.length === 0) {
        console.log('   No gurus found, skipping guru questions.');
        return;
    }

    const insertQuestion = usersDb.prepare(`
        INSERT INTO guru_questions (guru_user_id, asker_user_id, title, content, reply_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertReply = usersDb.prepare(`
        INSERT INTO guru_question_replies (question_id, user_id, parent_reply_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    let totalQuestions = 0;
    let totalReplies = 0;

    const generateAll = usersDb.transaction(() => {
        for (const guru of gurus) {
            // Each guru gets 2-5 questions
            const numQuestions = Math.floor(Math.random() * 4) + 2;

            for (let i = 0; i < numQuestions; i++) {
                const asker = pickRandom(nonGuruUsers);
                const title = pickRandom(sampleGuruQuestionTitles);
                const content = pickRandom(sampleGuruQuestionContents);

                // Random time (1-20 days ago) in CST
                const daysAgo = Math.floor(Math.random() * 20) + 1;
                const questionTimestamp = getCSTTimestampPast(daysAgo, 0);
                const questionTime = new Date(questionTimestamp.replace(' ', 'T'));

                // Insert question with 0 reply_count initially
                const result = insertQuestion.run(guru.id, asker.id, title, content, 0, questionTimestamp);
                const questionId = Number(result.lastInsertRowid);
                totalQuestions++;

                // 70% chance the guru replies
                let replyCount = 0;
                if (Math.random() < 0.7) {
                    const replyContent = pickRandom(sampleGuruQuestionReplies);
                    const hoursLater = Math.floor(Math.random() * 48) + 1;
                    const { timestamp: replyTimestamp, date: replyTime } = getCSTTimestampAfter(questionTime, hoursLater);

                    insertReply.run(questionId, guru.id, null, replyContent, replyTimestamp);
                    totalReplies++;
                    replyCount++;

                    // 40% chance of follow-up from asker
                    if (Math.random() < 0.4) {
                        const followUpContent = pickRandom(sampleReplyToReplies);
                        const followUpHours = Math.floor(Math.random() * 24);
                        const { timestamp: followUpTimestamp } = getCSTTimestampAfter(replyTime, followUpHours);

                        insertReply.run(questionId, asker.id, null, followUpContent, followUpTimestamp);
                        totalReplies++;
                        replyCount++;
                    }
                }

                // Update reply count
                if (replyCount > 0) {
                    usersDb.prepare('UPDATE guru_questions SET reply_count = ? WHERE id = ?').run(replyCount, questionId);
                }
            }
        }
    });

    generateAll();

    console.log(`   ${totalQuestions} guru questions created.`);
    console.log(`   ${totalReplies} guru question replies created.`);
}

function printSummary() {
    console.log('\n========== SEED COMPLETE ==========\n');

    const communityCount = communitiesDb.prepare('SELECT COUNT(*) as count FROM communities').get();
    const userCount = usersDb.prepare('SELECT COUNT(*) as count FROM users').get();
    const guruCount = usersDb.prepare('SELECT COUNT(*) as count FROM users WHERE is_guru = 1').get();
    const membershipCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_communities').get();
    const diseaseHistoryCount = usersDb.prepare('SELECT COUNT(*) as count FROM user_disease_history').get();
    const threadCount = threadsDb.prepare('SELECT COUNT(*) as count FROM threads').get();
    const threadCommunityCount = threadsDb.prepare('SELECT COUNT(*) as count FROM thread_communities').get();
    const replyCount = repliesDb.prepare('SELECT COUNT(*) as count FROM replies').get();
    const topLevelReplyCount = repliesDb.prepare('SELECT COUNT(*) as count FROM replies WHERE parent_reply_id IS NULL').get();
    const guruQuestionCount = usersDb.prepare('SELECT COUNT(*) as count FROM guru_questions').get();
    const guruQuestionReplyCount = usersDb.prepare('SELECT COUNT(*) as count FROM guru_question_replies').get();

    console.log('Database Statistics:');
    console.log(`  Communities:            ${communityCount.count}`);
    console.log(`  Users:                  ${userCount.count}`);
    console.log(`    - Gurus (明星):       ${guruCount.count}`);
    console.log(`  User-Community links:   ${membershipCount.count}`);
    console.log(`  User Disease History:   ${diseaseHistoryCount.count}`);
    console.log(`  Threads:                ${threadCount.count}`);
    console.log(`  Thread-Community links: ${threadCommunityCount.count}`);
    console.log(`  Replies:                ${replyCount.count}`);
    console.log(`    - Top-level (cards):  ${topLevelReplyCount.count}`);
    console.log(`    - Stacked:            ${replyCount.count - topLevelReplyCount.count}`);
    console.log(`  Guru Questions:         ${guruQuestionCount.count}`);
    console.log(`  Guru Question Replies:  ${guruQuestionReplyCount.count}`);

    console.log('\nSample member counts:');
    const sampleCommunities = communitiesDb.prepare('SELECT name, member_count FROM communities LIMIT 5').all();
    for (const c of sampleCommunities) {
        console.log(`  ${c.name}: ${c.member_count} members`);
    }

    console.log('\nGurus (明星):');
    const guruList = usersDb.prepare('SELECT username FROM users WHERE is_guru = 1').all();
    console.log(`  ${guruList.map(g => g.username).join(', ')}`);

    console.log('\nTest Login:');
    console.log('  Username: user001');
    console.log('  Password: Pass001!');
    console.log('\n====================================\n');
}

// ============ RUN ============

function main() {
    console.log('====================================');
    console.log('   P-LikeMe Database Seed Script');
    console.log('====================================\n');

    initDb();
    seedCommunities();
    seedUsers();
    linkUsersToCommunities();
    generateThreads();
    generateReplies();
    generateGuruQuestions();
    printSummary();
}

main();
