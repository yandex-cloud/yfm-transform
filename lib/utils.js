const {parse, resolve, join} = require('path');
const {
    readFileSync,
    statSync,
} = require('fs');

const liquid = require('./liquid');

const filesCache = {};

function isLocalUrl(url) {
    return !/^(?:[a-z]+:)?\/\//i.test(url);
}

function isFileExists(file) {
    try {
        const stats = statSync(file);

        return stats.isFile();
    } catch (e) {
        return false;
    }
}

function resolveRelativePath(fromPath, relativePath) {
    const {dir: fromDir} = parse(fromPath);
    return resolve(fromDir, relativePath);
}

function getFileTokens(path, state, options) {
    const {getVarsPerFile, vars, disableLiquid, disableLint, lintMarkdown} = options;
    let content;

    if (filesCache[path]) {
        content = filesCache[path];
    } else {
        content = readFileSync(path, 'utf8');

        if (!disableLint && lintMarkdown) {
            lintMarkdown({input: content, path});
        }

        const builtVars = getVarsPerFile ? getVarsPerFile(path) : vars;
        content = disableLiquid ? content : liquid(content, builtVars, path);
        filesCache[path] = content;
    }

    const meta = state.md.meta;
    const tokens = state.md.parse(content, {...state.env, path});
    state.md.meta = meta;

    return tokens;
}

function findBlockTokens(tokens, id) {
    let blockTokens = [];
    let i = 0, startToken, start, end;
    while (i < tokens.length) {
        const token = tokens[i];

        if (typeof start === 'number') {
            if (startToken.type === 'paragraph_open' && token.type === 'paragraph_close') {
                end = i + 1;
                break;
            } else if (startToken.type === 'heading_open') {
                if (token.type === 'heading_open' && token.tag === startToken.tag) {
                    end = i;
                    break;
                } else if (i === tokens.length - 1) {
                    end = tokens.length;
                }
            }
        }

        if (
            (token.type === 'paragraph_open' || token.type === 'heading_open') &&
            token.attrGet('id') === id &&
            typeof start === 'undefined'
        ) {
            startToken = token;
            start = i;
        }

        i++;
    }

    if (typeof start === 'number' && typeof end === 'number') {
        blockTokens = tokens.slice(start, end);
    }

    return blockTokens;
}

function headingInfo(tokens, idx) {
    const openToken = tokens[idx];
    const inlineToken = tokens[idx + 1];

    let lastTextToken, i = 0;
    while (i < inlineToken.children.length) {
        const token = inlineToken.children[i];

        if (token.type === 'text') {
            lastTextToken = token;
        }

        i++;
    }

    const level = Number.parseInt(openToken.tag.slice(1), 10);
    const title = lastTextToken && lastTextToken.content || inlineToken.content;

    return {
        level,
        title,
    };
}

const getFullIncludePath = (includePath, root, path) => {
    let fullIncludePath;
    if (includePath.startsWith('/')) {
        fullIncludePath = join(root, includePath);
    } else {
        fullIncludePath = resolveRelativePath(path, includePath);
    }

    return fullIncludePath;
};

function isExternalHref(href) {
    return href.startsWith('http') || href.startsWith('//');
}

function getSinglePageAnchorId({root, currentPath, pathname, hash}) {
    let resultAnchor = currentPath;

    if (pathname) {
        resultAnchor = resolveRelativePath(currentPath, pathname);
    }

    resultAnchor = resultAnchor
        .replace(root, '')
        .replace(/\.(md|ya?ml|html)$/i, '')
        .replace(new RegExp('/', 'gi'), '_');

    if (hash) {
        resultAnchor = resultAnchor + '_' + hash.slice(1);
    }

    return `#${resultAnchor}`;
}

function transformLinkToOriginalArticle({root, currentPath}) {
    return currentPath
        .replace(root, '')
        .replace(/\.(md|ya?ml|html)$/i, '');
}

module.exports = {
    isLocalUrl,
    isFileExists,
    getFullIncludePath,
    resolveRelativePath,
    getFileTokens,
    findBlockTokens,
    headingInfo,
    isExternalHref,
    getSinglePageAnchorId,
    transformLinkToOriginalArticle,
};
