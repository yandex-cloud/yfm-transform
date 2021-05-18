import {LintRulesOptions} from '../lintRules/models';

export default function liquid(
    originInput: string,
    options?: {
        vars: Record<string, string>;
        path: string;
        conditions?: boolean;
        conditionsInCode?: boolean;
        cycle?: boolean;
        substitutions?: boolean;
        disableLint?: boolean;
        lintOptions?: LintRulesOptions
    },
): string;
