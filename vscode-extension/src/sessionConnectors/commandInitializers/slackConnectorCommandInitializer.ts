import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { refreshActivityBar } from '../../activityBar/activityBar';
import { connectorRepository } from '../../connectorRepository/connectorRepository';
import { CancellationError } from '../../errors/CancellationError';
import { IConnectorCommandInitializer } from '../../interfaces/IConnectorCommandInitializer';
import { ISlackTeamInfo } from '../../interfaces/ISlackTeamInfo';

export class SlackConnectorCommandInitializer
    implements IConnectorCommandInitializer {
    public init = async () => {
        const token = await vscode.window.showInputBox({
            prompt: 'Slack token for your workspace.',
            ignoreFocusOut: true,
        });

        if (!token) {
            throw new CancellationError('No Slack token is specified.');
        }

        const teamResponse = await fetch('https://slack.com/api/team.info', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const teamInfo: {
            ok: boolean;
            team: ISlackTeamInfo;
        } = await teamResponse.json();

        if (!teamInfo.ok) {
            throw new Error('Cannot retrieve info about the Slack team.');
        }

        const value = `${teamInfo.team.name}`;
        const name = await vscode.window.showInputBox({
            prompt: 'What is the name of this Slack connector?',
            ignoreFocusOut: true,
            value,
            valueSelection: [0, value.length],
        });

        if (!name) {
            throw new CancellationError('No connector name specified.');
        }

        await connectorRepository.addSlackConnector(name, teamInfo.team, token);

        refreshActivityBar();

        await vscode.window.showInformationMessage(
            `The Slack connector "${name}" successfully added.`
        );
    };
}
