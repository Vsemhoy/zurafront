import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
const resources = {
    en: { translation: {
            welcome: 'Welcome back', loginLead: 'Log in to your workspace to continue.', identity: 'Email or username',
            password: 'Password', forgot: 'Forgot password?', login: 'Log in', status: 'All systems operational',
            features: 'Features', changelog: 'Changelog', docs: 'Documentation', selfHosting: 'Self-hosting',
            version: 'Version 2.1', releaseTitle: 'Putting everything in its place.',
            releaseText: 'A sharper workspace, smarter sorting, and a completely rebuilt operational core.',
            whatsNew: "Read what's new", deploy: 'Deploy your own', dashboardGreeting: 'Good morning, Alex.',
            dashboardSummary: '4 tasks overdue, 2 upcoming meetings, 3h 45m tracked today.', newTask: 'New task',
            startTimer: 'Start timer', logExpense: 'Log expense', trajectory: "Today's trajectory", overdue: 'Overdue',
            inProgress: 'In progress', upcoming: 'Upcoming events', portfolios: 'Active portfolios', assistant: 'Assistant',
            assistantText: 'Everything is neatly categorized today. Ready for the end-of-day report?',
            ledger: 'Ledger snapshot', pinned: 'Pinned intel', search: 'Search commands…', activeScope: 'Work / Zuratax',
            switchScope: 'Switch scope…', activeRecent: 'Active & recent', recent: 'Last accessed 2h ago',
            personal: 'Personal', privacy: 'Privacy protected', hideLocked: 'Hide names of locked scopes', manage: 'Manage',
            createScope: 'Create scope', enterPin: 'Enter PIN', pinLead: 'Personal is protected for privacy.',
            wrongPin: 'Incorrect PIN. 2 attempts remaining.', cancel: 'Cancel', unlock: 'Unlock', lockAfter: 'Lock automatically after 15 minutes',
        } },
    ru: { translation: {
            welcome: 'С возвращением', loginLead: 'Войдите, чтобы продолжить работу.', identity: 'Почта или имя пользователя',
            password: 'Пароль', forgot: 'Забыли пароль?', login: 'Войти', status: 'Все системы работают',
            features: 'Возможности', changelog: 'История версий', docs: 'Документация', selfHosting: 'Самостоятельная установка',
            version: 'Версия 2.1', releaseTitle: 'Всё по своим местам.',
            releaseText: 'Более собранное пространство, умная сортировка и полностью обновлённое операционное ядро.',
            whatsNew: 'Что нового', deploy: 'Развернуть у себя', dashboardGreeting: 'Доброе утро, Алекс.',
            dashboardSummary: '4 задачи просрочены, 2 встречи впереди, сегодня учтено 3 ч 45 мин.', newTask: 'Новая задача',
            startTimer: 'Запустить таймер', logExpense: 'Записать расход', trajectory: 'План на сегодня', overdue: 'Просрочено',
            inProgress: 'В работе', upcoming: 'Ближайшие события', portfolios: 'Активные проекты', assistant: 'Ассистент',
            assistantText: 'Сегодня всё аккуратно разложено. Подготовить итоговый отчёт?',
            ledger: 'Сводка Ledger', pinned: 'Закреплённое', search: 'Поиск команд…', activeScope: 'Работа / Zuratax',
            switchScope: 'Переключить скоуп…', activeRecent: 'Активный и недавние', recent: 'Открывался 2 ч назад',
            personal: 'Личное', privacy: 'Защищено для конфиденциальности', hideLocked: 'Скрывать названия закрытых скоупов', manage: 'Управление',
            createScope: 'Создать скоуп', enterPin: 'Введите PIN-код', pinLead: 'Личный скоуп защищён от посторонних.',
            wrongPin: 'Неверный PIN-код. Осталось 2 попытки.', cancel: 'Отмена', unlock: 'Разблокировать', lockAfter: 'Блокировать автоматически через 15 минут',
        } },
    'zh-CN': { translation: {
            welcome: '欢迎回来', loginLead: '登录以继续使用您的工作空间。', identity: '邮箱或用户名',
            password: '密码', forgot: '忘记密码？', login: '登录', status: '所有系统运行正常',
            features: '功能', changelog: '更新日志', docs: '文档', selfHosting: '自行部署',
            version: '版本 2.1', releaseTitle: '各归其位。',
            releaseText: '更清晰的工作空间、智能分类，以及全面重构的运营核心。',
            whatsNew: '查看更新', deploy: '自行部署', dashboardGreeting: '早上好，Alex。',
            dashboardSummary: '4 项任务逾期，2 场会议即将开始，今日已记录 3 小时 45 分钟。', newTask: '新建任务',
            startTimer: '启动计时器', logExpense: '记录支出', trajectory: '今日轨迹', overdue: '逾期',
            inProgress: '进行中', upcoming: '近期活动', portfolios: '活跃项目', assistant: '助手',
            assistantText: '今天的一切都已整理妥当。要生成每日总结吗？',
            ledger: '账本概览', pinned: '置顶信息', search: '搜索命令…', activeScope: '工作 / Zuratax',
            switchScope: '切换空间…', activeRecent: '当前与最近使用', recent: '2 小时前访问',
            personal: '个人', privacy: '隐私保护', hideLocked: '隐藏已锁定空间的名称', manage: '管理空间',
            createScope: '创建空间', enterPin: '输入 PIN 码', pinLead: '个人空间已启用隐私保护。',
            wrongPin: 'PIN 码错误，还可尝试 2 次。', cancel: '取消', unlock: '解锁', lockAfter: '15 分钟后自动锁定',
        } },
};
const supported = ['en', 'ru', 'zh-CN'];
const saved = localStorage.getItem('zuratax-language');
const browserLanguage = navigator.language.toLowerCase();
const detected = browserLanguage.startsWith('ru') ? 'ru' : browserLanguage.startsWith('zh') ? 'zh-CN' : 'en';
const initialLanguage = supported.includes(saved) ? saved : detected;
void i18n.use(initReactI18next).init({ resources, lng: initialLanguage, fallbackLng: 'en', interpolation: { escapeValue: false } });
document.documentElement.lang = initialLanguage;
i18n.on('languageChanged', (language) => {
    localStorage.setItem('zuratax-language', language);
    document.documentElement.lang = language;
});
export default i18n;
