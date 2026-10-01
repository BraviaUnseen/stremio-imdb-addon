const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Helper function to extract IMDb IDs using direct CSV export & HTML regex fallbacks
async function getImdbListItems(listId) {
    let ids = [];

    // Method 1: IMDb List CSV Export (Most Reliable)
    try {
        const csvUrl = `https://www.imdb.com/list/${listId}/export`;
        const response = await axios.get(csvUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/csv,text/plain,*/*'
            },
            timeout: 8000
        });

        if (response.data && typeof response.data === 'string') {
            const matches = response.data.match(/tt\d{7,8}/g) || [];
            ids = [...new Set(matches)];
        }
    } catch (e) {
        console.log(`CSV Export failed for ${listId}, trying GraphQL...`);
    }

    // Method 2: GraphQL API Fallback
    if (ids.length === 0) {
        try {
            const query = `
            query GetListItems($listId: ID!) {
                list(id: $listId) {
                    titleListItemSearch(first: 250) {
                        edges {
                            node {
                                title { id }
                            }
                        }
                    }
                }
            }`;

            const response = await axios.post(
                'https://graphql.imdb.com/',
                { query, variables: { listId } },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                    },
                    timeout: 8000
                }
            );

            const edges = response.data?.data?.list?.titleListItemSearch?.edges || [];
            ids = edges.map(edge => edge.node.title.id);
        } catch (e) {
            console.log(`GraphQL failed for ${listId}, trying HTML regex fallback...`);
        }
    }

    // Method 3: Direct Web Scraping Fallback
    if (ids.length === 0) {
        try {
            const url = `https://www.imdb.com/list/${listId}/`;
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                timeout: 8000
            });
            const matches = response.data.match(/tt\d{7,8}/g) || [];
            ids = [...new Set(matches)];
        } catch (e) {
            console.error(`All fetch methods failed for list ${listId}:`, e.message);
        }
    }

    return ids.map(id => ({ id, name: id }));
}

app.get('/', (req, res) => res.send('IMDb Stremio Addon Active'));

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
    const reqType = req.params.type;
    
    const rawItems = await getImdbListItems(lsCode);
    const metas = rawItems.map(item => ({
        id: item.id,
        type: reqType,
        name: item.id
    }));

    res.json({ metas });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
