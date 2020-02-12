import * as vscode from 'vscode';
import { registerBranchBroadcastingExperiment } from './branchBroadcast';
import { startListenToOriginPush } from './branchBroadcast/git/onCommit';
import { initializeLiveShare } from './branchBroadcast/liveshare';
import { registerCommands } from './commands';
import { CommandId } from './commands/registerCommand';
import { EXTENSION_NAME } from './constants';
import * as keytar from './keytar';
import { initializeKeytar } from './keytar';
import { log } from './logger';
import { initializeMemento } from './memento';

const checkGitHubAuthToken = async () => {
    const token = await keytar.get('githubSecret');

    if (!token) {
        await vscode.window.showInformationMessage(
            'No GitHub API token set, please set it to proceed.'
        );

        await vscode.commands.executeCommand(CommandId.setGitHubToken);
    }
};

export const activate = async (context: vscode.ExtensionContext) => {
    try {
        log.setLoggingChannel(
            vscode.window.createOutputChannel(EXTENSION_NAME)
        );

        initializeKeytar();
        initializeMemento(context);

        registerCommands();

        await checkGitHubAuthToken();

        await initializeLiveShare();
        await registerBranchBroadcastingExperiment();

        startListenToOriginPush();

        // removeAllBranchBroadcasts();
    } catch (e) {
        log.error(e);
        vscode.window.showErrorMessage(e.message);
    }
};

export const deactivate = async () => {};
