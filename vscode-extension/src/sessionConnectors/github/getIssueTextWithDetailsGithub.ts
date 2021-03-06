import { IRegistryData } from '../../commands/registerBranch/branchRegistry';
import { IGitHubIssue } from '../../interfaces/IGitHubIssue';
import {
    ISSUE_SESSION_DETAILS_FOOTER,
    ISSUE_SESSION_DETAILS_HEADER,
} from '../constants';
import { getIssueDetailsGit } from './getIssueDetailsGit';
import { getIssueDetailsLiveShare } from './getIssueDetailsLiveShare';
import { renderGuestsGithub } from './renderGuestsGithub';

export const getIssueTextWithDetailsGithub = async (
    description: string,
    data: IRegistryData,
    githubIssue: IGitHubIssue
) => {
    const descriptionRegex = /(\!\[togezr\sseparator\]\(https:\/\/aka\.ms\/togezr-issue-separator-image\)[\s\S]+\#\#\#\#\#\# powered by \[Togezr\]\(https\:\/\/aka\.ms\/togezr-issue-website-link\))/gm;
    const isPresent = !!description.match(descriptionRegex);

    const guestsWithBranchInfo = [
        await renderGuestsGithub(data.guests),
        getIssueDetailsGit(data, githubIssue),
    ].join('\n');

    const issueDetails = [
        ISSUE_SESSION_DETAILS_HEADER,
        getIssueDetailsLiveShare(data),
        guestsWithBranchInfo,
        ISSUE_SESSION_DETAILS_FOOTER,
    ]
        .filter((item) => {
            return !!item;
        })
        .join('\n\n');

    if (isPresent) {
        return description.replace(descriptionRegex, issueDetails);
    }
    return `${description}\n\n${issueDetails}`;
};
