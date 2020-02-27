const https = require('https');

const getSessionInfo = async (sessionId) => {
    return new Promise((resolve) => {
        const req = https.request(`https://prod.liveshare.vsengsaas.visualstudio.com/api/v0.2/workspace/${sessionId}/owner/`, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', (error) => {
            resolve(null);
        });

        req.end();
    });
}

const getBadgeLabel = (sessionInfo) => {
    if (!sessionInfo) {
        return 'Not found';
    }

    return (sessionInfo.connected)
        ? encodeURIComponent('⚡ Join the session ‣')
        : 'Offline';
}

const getBadgeColor = (sessionInfo) => {
    // scheduled session: #8F81CF
    if (!sessionInfo) {
        return 'CB4B4B';
    }

    return (sessionInfo.connected)
        ? '4BCB54'
        : '828282';
}

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    if (!req.query.sessionId) {
        context.res = {
            status: 400,
            body: 'No `sessonId` set.'
        };

        return;
    }

    const sessionInfo = await getSessionInfo(req.query.sessionId);
    const url = `https://img.shields.io/badge/Live%20Share%20-${getBadgeLabel(sessionInfo)}-${getBadgeColor(sessionInfo)}.svg?style=flat-square&logo=data:image/png;base64,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`;

    context.res = {
        status: 307,
        body: '',
        headers: {
            Location: url
        }
    }
};
