import * as vscode from 'vscode';
import { refreshActivityBar } from '../../activityBar/activityBar';
import {
    createBranch,
    getCurrentBranch,
    getCurrentRepo,
    switchToTheBranch,
} from '../../branchBroadcast/git';
import { startLiveShareSession } from '../../branchBroadcast/liveshare';
import { connectorRepository } from '../../connectorRepository/connectorRepository';
import { CancellationError } from '../../errors/CancellationError';
import { IConnectorData } from '../../interfaces/IConnectorData';
import { renderSessionDetails } from '../../sessionConnectors/github/githubSessionConnector';
import { getConnectorRegistrationInitializer } from '../../sessionConnectors/registrationInitializers';
import { IRegistryData, registerBranch } from './branchRegistry';

const getConnectorDetailsRenderer = (connector: IConnectorData) => {
    // Support Github connector for branch connector messages for now
    if (connector.type === 'GitHub') {
        return renderSessionDetails;
    }

    // if (connector.type === 'Slack') {
    //     return renderBranchConnectedMessageSlack;
    // }
};

const sendInitializationConnectorMessages = async (
    connectors: IConnectorData[],
    registryData: IRegistryData
) => {
    const promises = [];
    for (let connector of connectors) {
        const renderer = getConnectorDetailsRenderer(connector);

        if (!renderer) {
            continue;
        }

        promises.push(renderer(registryData));
    }

    await Promise.all(promises);
};

export const registerTheBranchAndAskToSwitch = async (
    repoId: string,
    branchName: string,
    connectorsData: IConnectorData[],
    isShouldSwitchBranch: boolean,
    isReadOnly: boolean,
    fromBranch?: string
) => {
    if (fromBranch) {
        await createBranch(branchName, isShouldSwitchBranch, fromBranch);
    }

    if (!vscode.workspace.rootPath) {
        throw new Error('No project openned.');
    }

    const registryData = await registerBranch({
        repoId,
        branchName,
        connectorsData,
        isReadOnly,
        repoRootPath: vscode.workspace.rootPath.toString(),
    });

    const repo = getCurrentRepo();

    if (!repo) {
        throw new Error('No repo openned.');
    }

    refreshActivityBar();
    await repo.push('origin', branchName);

    await sendInitializationConnectorMessages(connectorsData, registryData);

    const currentBranch = getCurrentBranch();
    const buttonPrefix =
        !currentBranch || currentBranch.name !== branchName ? 'Switch & ' : '';
    const startButton = `${buttonPrefix}Start session`;
    const answer = await vscode.window.showInformationMessage(
        `The "${branchName}" was connected with ${registryData.connectorsData.length} channels. Start session now?`,
        startButton
    );

    if (answer === startButton) {
        await switchToTheBranch(branchName, true);
        await startLiveShareSession(registryData.id);
    }
};

export const startRegisteringTheBranch = async (
    repoId: string,
    branchName: string,
    fromBranch?: string,
    isShouldSwitchBranch = false
) => {
    const READ_ONLY_BUTTON = 'Read-only session';
    const answer = await vscode.window.showQuickPick(
        ['Read/Write session', READ_ONLY_BUTTON],
        {
            placeHolder: 'Select session type by default',
            ignoreFocusOut: true,
        }
    );

    if (!answer) {
        throw new CancellationError('No default session type selected.');
    }

    const isReadOnlySession = answer === READ_ONLY_BUTTON;

    const registeredConnectors = connectorRepository.getConnectors();
    if (!registeredConnectors.length) {
        throw new Error(
            'No connectors found, register one first by running `Togezr: Add connector` command in command palette.'
        );
    }

    const connectorsOptions = registeredConnectors.map((r) => {
        return {
            label: `${r.type}: ${r.name}`,
            id: r.id,
            type: r.type,
        };
    });

    const connectors = await vscode.window.showQuickPick(connectorsOptions, {
        canPickMany: true,
        ignoreFocusOut: true,
        placeHolder: 'Pick connector(s)',
    });

    if (!connectors) {
        throw new Error('Please select at least one connector.');
    }

    const connectorsData: IConnectorData[] = [];

    for (let { id, type } of connectors) {
        const init = getConnectorRegistrationInitializer(type);

        if (!init) {
            connectorsData.push({ id, type });
            continue;
        }

        const data = await init.getData(id);

        connectorsData.push({ id, data, type });
    }

    await registerTheBranchAndAskToSwitch(
        repoId,
        branchName,
        connectorsData,
        isShouldSwitchBranch,
        isReadOnlySession,
        fromBranch
    );
};
