import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    try {
        const branchToEnvMap = core.getInput('branch-to-env-map', { required: true })
                                   .split('\n')
                                   .map(x => x.trim().split('='))
                                   .reduce<Record<string, string>>((acc, curr) => {
                                       acc[curr[0]] = curr[1];
                                       return acc;
                                   }, {});
        const branch = github.context.ref.replace('refs/heads/', '');
        const envValue = branchToEnvMap[branch];

        if (!envValue) {
            core.setFailed(`No environment value mapped for branch '${ branch }'. Available mappings: ${ JSON.stringify(
                branchToEnvMap) }`);
            return;
        }

        core.exportVariable('ENV', envValue);
        core.exportVariable('NODE_ENV', envValue);
        core.info(`Set ENV and NODE_ENV to ${ envValue } for branch ${ branch }`);

        for (const key of Object.keys(process.env)) {
            const envPrefix = envValue.toUpperCase();
            if (key.startsWith(`${ envPrefix }_`)) {
                const newKey = key.replace(`${ envPrefix }_`, '');
                const value = process.env[key];
                core.exportVariable(newKey, value);
                core.info(`Loaded ${ key } into ${ newKey }`);
                if(value === undefined || value === "")
                    core.warning(`Value for ${newKey} is undefined or empty`)
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        } else {
            core.setFailed(`Unknown error of type '${ typeof error }${ typeof error === 'object'
                                                                       ? ` / ${ error!.constructor.name }`
                                                                       : '' }' occurred:\n\n${ error }`);
        }
    }
}
