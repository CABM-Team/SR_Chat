// splitter.js - 文本分句工具
// 分离【xxx】表情标记和标点符号（。！？...）

/**
 * 文本分句
 * @param {string} text - 原始文本
 * @returns {Array} 分句后的数组，【xxx】格式作为表情包标记
 */
function splitText(text) {
    console.log('原始文本:', text);
    if (!text || typeof text !== 'string') {
        return [];
    }

    const segments = [];
    let currentText = '';

    // 正则匹配【xxx】格式的表情包标记
    const emojiPattern = /【([^】]+)】/g;
    let lastIndex = 0;
    let match;

    while ((match = emojiPattern.exec(text)) !== null) {
        // 处理表情包之前的文本
        const beforeEmoji = text.substring(lastIndex, match.index);
        if (beforeEmoji) {
            const splitParts = splitByPunctuation(beforeEmoji);
            segments.push(...splitParts);
        }

        // 添加表情包标记
        segments.push(match[0]); // 保留完整格式【xxx】
        lastIndex = emojiPattern.lastIndex;
    }

    // 处理剩余文本
    if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        const splitParts = splitByPunctuation(remainingText);
        segments.push(...splitParts);
    }

    // 过滤空字符串
    console.log('原始分句:', segments);
    return segments.filter(seg => seg && seg.trim() !== '');
}

function getEffectiveLength(str) {
    return str
        .replace(/\.\.\./g, '')
        .replace(/……/g, '')
        .replace(/…/g, '')
        .replace(/\s/g, '')
        .length;
}
/**
 * 通过标点符号分句，并去除每句末尾的句号
 * @param {string} text - 待分句文本
 * @returns {Array} 分句后的数组
 */
function splitByPunctuation(text) {
    const segments = [];

    const LEFT_BRACKETS = new Set([
        '{',
        '[',
        '(',
        '（',
        '「',
        '"',
        '“',
    ]);

    const RIGHT_BRACKETS = new Set([
        '}',
        ']',
        ')',
        '）',
        '」',
        '"',
        '”',
    ]);

    let current = '';
    let i = 0;

    function pushCurrent() {
        const trimmed = current.trim();

        if (!trimmed) {
            current = '';
            return;
        }

        segments.push(
            trimmed.replace(/。$/, '')
        );

        current = '';
    }

    while (i < text.length) {
        const ch = text[i];

        // =========================
        // 左括号
        // =========================
        if (LEFT_BRACKETS.has(ch)) {
            pushCurrent();
            current = ch;
            i++;
            continue;
        }

        // =========================
        // 三个点 ...
        // =========================
        if (text.substr(i, 3) === '...') {
            current += '...';

            if (getEffectiveLength(current) >= 6) {
                if (RIGHT_BRACKETS.has(text[i + 3])) {
                    current += text[i + 3];
                    i++;
                }
                pushCurrent();
            }

            i += 3;
            continue;
        }

        // =========================
        // 中文省略号 ……
        // =========================
        if (text.substr(i, 2) === '……') {
            current += '……';

            if (getEffectiveLength(current) >= 6) {
                if (RIGHT_BRACKETS.has(text[i + 2])) {
                    current += text[i + 2];
                    i++;
                }
                pushCurrent();
            }

            i += 2;
            continue;
        }

        // =========================
        // 单个 …
        // =========================
        if (ch === '…') {
            current += '…';

            if (getEffectiveLength(current) >= 6) {
                if (RIGHT_BRACKETS.has(text[i + 1])) {
                    current += text[i + 1];
                    i++;
                }
                pushCurrent();
            }

            i++;
            continue;
        }

        current += ch;

        // =========================
        // 普通句末符号
        // =========================
        if ('。！？!?'.includes(ch)) {
            const nextChar = text[i + 1];

            if (RIGHT_BRACKETS.has(nextChar)) {
                current += nextChar;  // 把右括号加到 current
                i++;                   // 跳过右括号
                // 注意：这里不要 continue，继续执行下面的 pushCurrent
            }

            pushCurrent();
            i++;
            continue;
        }

        // =========================
        // 右括号
        // =========================
        if (RIGHT_BRACKETS.has(ch)) {
            pushCurrent();
            i++;
            continue;
        }

        i++;
    }

    pushCurrent();

    return segments;
}

/**
 * 检查文本是否是表情包标记
 * @param {string} text - 待检查文本
 * @returns {boolean} 是否是表情包标记
 */
function isEmojiMarker(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }
    return /^【[^】]+】$/.test(text);
}

/**
 * 从表情包标记中提取表情名称
 * @param {string} marker - 表情包标记（如【笑】）
 * @returns {string} 表情名称（如 '笑'）
 */
function extractEmojiName(marker) {
    if (!marker || typeof marker !== 'string') {
        return '';
    }
    const match = marker.match(/^【([^】]+)】$/);
    return match ? match[1] : '';
}