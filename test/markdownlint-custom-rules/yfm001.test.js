const yfmlint = require('../../lib/yfmlint');
const merge = require('lodash/merge');
const {log} = require('../utils');

const testInput = `
\`single-line inline code\` \`another single-line inline code\`

\`
multi-line inline code
\`

\`
another multi-line
inline code
\`

\`|\`

\`\`\`
prefix \`inline quotes inside block code\` postfix
prefix \`another inline quotes inside block code\` postfix
\`\`\`

\`\`\`sql
block code
\`\`\`

    \`\`\`sql
    indented block code
    \`\`\`

\`, ?, !

Some text for testing not escaped and not closed quote
\`
`.trim();

const testFn = 'test.md';
const lintConfig = {
    'log-levels': {
        'MD046': 'disabled',
        'MD047': 'disabled',
        'YFM002': 'disabled',
    },
};

describe('YFM001', () => {
    beforeEach(() => {
        log.clear();
    });

    it('All inline codes are shorter than value', () => {
        yfmlint({
            input: testInput,
            pluginOptions: {log, path: testFn},
            lintConfig,
        });

        expect(log.isEmpty()).toEqual(true);
    });

    it('All inline codes are longer than value', () => {
        yfmlint({
            input: testInput,
            pluginOptions: {log, path: testFn},
            lintConfig: {...lintConfig, 'YFM001': {maximum: 5}},
        });

        expect(log.get().warn.length).toEqual(3);
    });

    it('Change log level', () => {
        yfmlint({
            input: testInput,
            pluginOptions: {log, path: testFn},
            lintConfig: merge({}, lintConfig, {
                'YFM001': {maximum: 5},
                'log-levels': {
                    'inline-code-length': 'error',
                },
            }),
        });

        expect(log.get().error.length).toEqual(3);
    });
});
