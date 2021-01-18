const {parse, resolve, join} = require('path');
const {
    readFileSync,
    statSync,
} = require('fs');
const {bold} = require('chalk');
const log = require('./log');
const MarkdownIt = require('markdown-it');

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
    const {getVarsPerFile, vars} = options;
    let content;

    if (filesCache[path]) {
        content = filesCache[path];
    } else {
        content = readFileSync(path, 'utf8');
        const builtVars = getVarsPerFile ? getVarsPerFile(path) : vars;
        content = liquid(content, builtVars, path);
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

const docsIds = {};
const saveId = (path, id) => {
    docsIds[path] = docsIds[path] || {};

    if (docsIds[path]._processed) {
        return;
    }

    if (!docsIds[path]._processed && docsIds[path][id]) {
        log.error(`Anchor ${bold(id)} is duplicated in ${bold(path)}`);
    }

    docsIds[path][id] = true;
};
const isExistId = ({file, id, root, isPageFile, fileExists}) => {
    /* TODO: don't skip links referring to pathname, directory with index file, markdown file without extension */
    if (!isPageFile || !fileExists) {
        return true;
    }

    // There is anchor in cache
    if (docsIds[file] && docsIds[file][id]) {
        return true;
    }

    // File has been processed yet
    if (docsIds[file] && docsIds[file]._processed && !docsIds[file][id]) {
        return false;
    }

    //console.log('START')
    const md = new MarkdownIt();
    [
        require('./plugins/includes'),
        require('./plugins/anchors'),
    ].forEach((plugin) => md.use(plugin, {path: file, root}));

    const content = readFileSync(file, 'utf8');
    md.parse(content, {path: file, root});
    //console.log('END', docsIds)

    setAnchorsProcessed(file);

    return docsIds[file] && docsIds[file][id];
};

const setAnchorsProcessed = (file) => {
    docsIds[file] = docsIds[file] || {};
    docsIds[file]._processed = true;

    return Boolean(docsIds[file]);
};

module.exports = {
    isLocalUrl,
    isFileExists,
    getFullIncludePath,
    resolveRelativePath,
    getFileTokens,
    findBlockTokens,
    headingInfo,
    isExternalHref,
    saveId,
    isExistId,
    setAnchorsProcessed,
};
