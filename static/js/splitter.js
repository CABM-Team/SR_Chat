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

/**
 * 通过标点符号分句，并去除每句末尾的句号
 * @param {string} text - 待分句文本
 * @returns {Array} 分句后的数组
 */
function splitByPunctuation(text) {
    const punctuationPattern = /([^。！？\n]+[。！？]+)/g;
    const segments = [];

    let match;
    let lastMatchEnd = 0;

    while ((match = punctuationPattern.exec(text)) !== null) {
        let sentence = match[0].trim();

        if (sentence) {
            sentence = sentence.replace(/。$/, '');
            segments.push(sentence);
        }

        lastMatchEnd = punctuationPattern.lastIndex;
    }

    if (lastMatchEnd < text.length) {
        let remaining = text.substring(lastMatchEnd).trim();

        if (remaining) {
            remaining = remaining.replace(/。$/, '');
            segments.push(remaining);
        }
    }

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