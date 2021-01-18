const {dirname, resolve} = require('path');
const {readFileSync} = require('fs');
const links = require('../lib/plugins/links');
const {callPlugin, tokenize, getValidateAnchorsMd, log} = require('./utils');
const {title, customTitle} = require('./data/links');

const callLinksPlugin = callPlugin.bind(null, links);

describe('Links', () => {
    test('Should create link with custom title', () => {
        const mocksPath = require.resolve('./utils.js');

        const result = callLinksPlugin(tokenize([
            'Text before link',
            '',
            '[Custom title](./mocks/link.md) %}',
            '',
            'After link',
        ]), {
            path: mocksPath,
            root: dirname(mocksPath),
        });

        expect(result).toEqual(customTitle);
    });

    test('Should create link with title from target', () => {
        const mocksPath = require.resolve('./utils.js');

        const result = callLinksPlugin(tokenize([
            'Text before link',
            '',
            '[{#T}](./mocks/link.md)',
            '',
            'After link',
        ]), {
            path: mocksPath,
            root: dirname(mocksPath),
        });

        expect(result).toEqual(title);
    });

    test('Link to the anchor inside the file', () => {
        log.clear();
        const root = resolve(__dirname, './mocks/validateAnchors/test1');
        const path = `${root}/index.md`;
        const content = readFileSync(path, 'utf8');

        const md = getValidateAnchorsMd({root, path});
        md.parse(content, {root, path});

        expect(log.get().error.length).toEqual(0);
    });

    test('Link to an anchor in another file', () => {
        log.clear();
        const root = resolve(__dirname, './mocks/validateAnchors/test2');
        const path = `${root}/index.md`;
        const content = readFileSync(path, 'utf8');

        const md = getValidateAnchorsMd({root, path});
        md.parse(content, {root, path});

        expect(log.get().error.length).toEqual(0);
    });
});
