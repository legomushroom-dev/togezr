import { Repository } from 'src/typings/git';
import * as vsls from 'vsls';
import { ISessionConnector } from '../branchBroadcast/interfaces/ISessionConnector';
import { getConnector } from '../commands/addConnectorCommand';
import { getBranchRegistryRecord } from '../commands/registerBranch/branchRegistry';

export class SessionConnectorHub {
    private sessionConnectors: ISessionConnector[] = [];

    constructor(
        vslsApi: vsls.LiveShare,
        repoId: string,
        branchName: string,
        repo: Repository
    ) {
        const registryData = getBranchRegistryRecord(repoId, branchName);
        if (!registryData) {
            throw new Error('No registry data found.');
        }

        const { connectorsData } = registryData;

        for (let connector of connectorsData) {
            const ConnectorClass = getConnector(connector.type);

            this.sessionConnectors.push(
                new ConnectorClass(vslsApi, repoId, branchName, repo, connector)
            );
        }
    }

    public async init() {
        const connectorsResult = this.sessionConnectors.map((conenctor) => {
            return conenctor.init();
        });

        await Promise.all(connectorsResult);
    }

    public async dispose() {
        const connectorsResult = this.sessionConnectors.map((conenctor) => {
            return conenctor.dispose();
        });

        await Promise.all(connectorsResult);
    }
}