const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Cache map for Cinemeta responses
const metaCache = new Map();

async function getCinemetaMeta(id, type) {
    const key = `${id}_${type}`;
    if (metaCache.has(key)) return metaCache.get(key);

    try {
        const res = await axios.get(`https://v3-cinemeta.strem.io/meta/${type}/${id}.json`, { timeout: 3000 });
        if (res.data && res.data.meta) {
            metaCache.set(key, res.data.meta);
            return res.data.meta;
        }
    } catch (e) {
        // Fallback handled below
    }
    return null;
}

// Fetch list items via IMDb Web GraphQL API
async function getImdbListItems(listId) {
    try {
        const query = `
        query GetList($listId: ID!) {
            list(id: $listId) {
                titleListItemSearch(first: 250) {
                    edges {
                        node {
                            title {
                                id
                                titleText { text }
                                titleType { id isSeries isEpisode }
                            }
                        }
                    }
                }
            }
        }`;

        const response = await axios.post('https://graphql.imdb.com/', 
            { query, variables: { listId } },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'x-imdb-app-name': 'imdb-web'
                },
                timeout: 8000
            }
        );

        const edges = response.data?.data?.list?.titleListItemSearch?.edges || [];
        return edges.map(edge => ({
            id: edge.node.title.id,
            name: edge.node.title.titleText?.text || edge.node.title.id,
            isSeries: edge.node.title.titleType?.isSeries || false
        }));
    } catch (error) {
        console.error(`GraphQL fetch failed for list ${listId}:`, error.message);
        
        // Fallback regex match if GraphQL fails
        try {
            const htmlRes = await axios.get(`https://www.imdb.com/list/${listId}/`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const matches = htmlRes.data.match(/tt\d{7,8}/g) || [];
            const uniqueIds = [...new Set(matches)];
            return uniqueIds.map(id => ({ id, name: id, isSeries: false }));
        } catch (e) {
            return [];
        }
    }
}

app.get('/', (req, res) => res.send('IMDb Addon Active'));

// Manifest Route
app.get('/:lsCode/manifest.json', (req, res) => {
    const lsCode = req.params.lsCode;
    res.json({
        id: `org.custom.imdb.${lsCode}`,
        version: '1.0.0',
        name: `IMDb List (${lsCode})`,
        description: `Live IMDb catalog for list ${lsCode}`,
        resources: ['catalog'],
        types: ['series', 'movie'],
        catalogs: [
            { type: 'series', id: `imdb_${lsCode}`, name: `IMDb Series: ${lsCode}` },
            { type: 'movie', id: `imdb_${lsCode}`, name: `IMDb Movies: ${lsCode}` }
        ]
    });
});

// Catalog Route
app.get('/:lsCode/catalog/:type/:catalogId*', async (req, res) => {
    const lsCode = req.params.lsCode;
    const reqType = req.params.type; // 'series' or 'movie'
    
    const items = await getImdbListItems(lsCode);
    
    const metaPromises = items.map(async (item) => {
        const cinemeta = await getCinemetaMeta(item.id, reqType);
        if (cinemeta) return cinemeta;

        return {
            id: item.id,
            type: reqType,
            name: item.name,
            poster: `https://images.metahub.space/poster/medium/${item.id}/img`
        };
    });

    const metas = await Promise.all(metaPromises);
    res.json({ metas });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
