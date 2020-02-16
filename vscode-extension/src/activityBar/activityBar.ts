import * as path from 'path';
import { Disposable, Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, window } from 'vscode';
// import { connectorRepository } from 'src/connectorRepository/connectorRepository';
import { getRegistryRecords, IRegistryData } from '../commands/registerBranch/branchRegistry';
import { connectorRepository, IGitHubConnector, ISlackConnector } from '../connectorRepository/connectorRepository';
import { EXTENSION_NAME_LOWERCASE } from '../constants';
import { IConnectorData } from '../interfaces/IConnectorData';
import { IGitHubIssue } from '../interfaces/IGitHubIssue';
import { ISlackChannel } from '../interfaces/ISlackChannel';
import { getIconPack } from '../utils/icons';

const BRANCH_CONNECTIONS_ITEM = new TreeItem(
    'Branch connections',
    TreeItemCollapsibleState.Expanded
);

const CONNECTORS_ITEM = new TreeItem(
    'Connectors',
    TreeItemCollapsibleState.Expanded
);

export class BranchConnectionTreeItem extends TreeItem {
    constructor(
        label: string,
        collapsibleState: TreeItemCollapsibleState,
        public registryData: IRegistryData
    ) {
        super(label, collapsibleState);

        const iconNameSuffix = registryData.isReadOnly ? 'readonly-' : '';

        this.iconPath = getIconPack(`branch-inline-${iconNameSuffix}icon.svg`);

        const tooltipSuffix = registryData.isReadOnly ? '(read-only)' : '';

        this.tooltip = `${label} ${tooltipSuffix}`;
        this.contextValue = 'togezr.branch.connection';
    }
}

class BranchGithubConnectionConnectorTreeItem extends TreeItem {
    constructor(connectorData: IConnectorData) {
        const githubIssue: IGitHubIssue = connectorData.data.githubIssue;

        const connector = connectorRepository.getConnector(connectorData.id);

        if (!connector) {
            throw new Error(
                `No connector found for "${connectorData.type}" / "${connectorData.id}"`
            );
        }

        const label = `${connector.name}`;
        super(label);

        this.description = `Issue#${githubIssue.number}`;

        this.iconPath = getIconPack('github-connector-icon.svg');
    }
}

class BranchSlackConnectionConnectorTreeItem extends TreeItem {
    constructor(connectorData: IConnectorData) {
        const { channel, channelConnectionName } = connectorData.data as {
            channel: ISlackChannel;
            channelConnectionName: string;
        };

        const connector = connectorRepository.getConnector(connectorData.id);

        if (!connector) {
            throw new Error(
                `No connector found for "${connectorData.type}" / "${connectorData.id}"`
            );
        }

        const label = channelConnectionName;
        super(label);

        this.description = channel.purpose.value;

        this.iconPath = getIconPack('slack-connector-icon.svg');
    }
}

export class ConnectorTreeItem extends TreeItem {
    public id: string;

    public contextValue: string = 'togezr.connector';

    constructor(connector: IGitHubConnector | ISlackConnector) {
        super(connector.name);

        this.id = connector.id;
        this.iconPath = getIconPack(this.getConnectorIconName(connector));
    }

    private getConnectorIconName(
        connector: IGitHubConnector | ISlackConnector
    ) {
        if (connector.type === 'GitHub') {
            return 'github-connector-icon.svg';
        }

        if (connector.type === 'Slack') {
            return 'slack-connector-icon.svg';
        }

        throw new Error(
            `Not know connector type: "${(connector as any).type}"`
        );
    }
}

export class ActivityBar implements TreeDataProvider<TreeItem>, Disposable {
    private _disposables: Disposable[] = [];

    private _onDidChangeTreeData = new EventEmitter<TreeItem>();
    public readonly onDidChangeTreeData: Event<TreeItem> = this
        ._onDidChangeTreeData.event;

    constructor() {
        BRANCH_CONNECTIONS_ITEM.iconPath = getIconPack('branch-icon.svg');
        CONNECTORS_ITEM.iconPath = getIconPack('connector-icon.svg');
    }

    public refresh() {
        this._onDidChangeTreeData.fire();
    }

    public getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
        if (!element) {
            return [BRANCH_CONNECTIONS_ITEM, CONNECTORS_ITEM];
        }

        if (element === BRANCH_CONNECTIONS_ITEM) {
            const branchConnections = getRegistryRecords();
            const items = Object.entries(branchConnections).map(
                ([name, registryData]) => {
                    const item = new BranchConnectionTreeItem(
                        `${registryData.branchName}`,
                        TreeItemCollapsibleState.Collapsed,
                        registryData
                    );
                    item.description = path.basename(registryData.repoId);

                    return item;
                }
            );

            return items;
        }

        if (element === CONNECTORS_ITEM) {
            const connectors = connectorRepository.getConnectors();

            const items = connectors.map((connector) => {
                const item = new ConnectorTreeItem(connector);

                return item;
            });

            return items;
        }

        if (element instanceof BranchConnectionTreeItem) {
            if (!element.registryData) {
                throw new Error(
                    'No registryData set on BranchConnectionTreeItem.'
                );
            }
            const items = element.registryData.connectorsData.map(
                (connector) => {
                    if (connector.type === 'GitHub') {
                        const item = new BranchGithubConnectionConnectorTreeItem(
                            connector
                        );

                        return item;
                    }

                    if (connector.type === 'Slack') {
                        const item = new BranchSlackConnectionConnectorTreeItem(
                            connector
                        );

                        return item;
                    }

                    throw new Error('Unknown connector type.');
                }
            );

            return items;
        }

        return [];
    }

    public getTreeItem(node: TreeItem): TreeItem {
        return node;
    }

    public dispose() {
        this._disposables.forEach((disposable) => disposable.dispose());
    }
}

let treeDataProvider: ActivityBar;
export const registerActivityBar = () => {
    treeDataProvider = new ActivityBar();

    window.createTreeView(`${EXTENSION_NAME_LOWERCASE}.activitybar`, {
        treeDataProvider,
    });
};

export const refreshActivityBar = () => {
    if (!treeDataProvider) {
        throw new Error(
            'ActivityBar is not initialized, call `registerActivityBar` first.'
        );
    }

    treeDataProvider.refresh();
};
