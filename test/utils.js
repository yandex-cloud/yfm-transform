const Token = require('markdown-it/lib/token');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();

function callPlugin(plugin, tokens, opts) {
    md.disable = () => {};
    md.enable = () => {};

    const state = {
        tokens,
        env: {},
        Token,
        md,
    };

    const fakeMd = {
        core: {
            ruler: {
                push: (name, cb) => cb(state),
                before: (anotherPlugin, name, cb) => cb(state),
            },
        },
    };

    plugin(fakeMd, opts);

    return state.tokens;
}

const paragraph = (content) => [
    {
        'type': 'paragraph_open',
        'content': '',
    }, {
        'type': 'inline',
        'children': [{
            'type': 'text',
            'tag': '',
            'children': null,
            content,
        }],
        content,
    }, {
        'type': 'paragraph_close',
        'content': '',
    },
];

const tokenize = (lines = []) => md.parse(lines.join('\n'), {});

const log = require('../lib/log');

const getValidateAnchorsMd = ({root, path}) => {
    const md = new MarkdownIt();
    const {links, anchors, includes} = require('../lib/plugins');

    [
        links,
        includes,
        anchors,
    ].forEach((plugin) => md.use(plugin, {root, path, log}));

    return md;
};

module.exports = {callPlugin, paragraph, tokenize, getValidateAnchorsMd, log};
