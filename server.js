const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Fetch items using IMDb GraphQL API directly
async function getImdbListItems(listId) {
    try {
        const query = `
        query GetListItems($listId: ID!) {
            list(id: $listId) {
                titleListItemSearch(first: 250) {
                    edges {
                        node {
                            title {
                                id
                            }
                        }
                    }
                }
            }
        }`;

        const response = await axios.post(
            'https://graphql.imdb.com/',
            {
                query: query,
                variables: { listId: listId }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            }
        );

        const edges = response.data?.data?.list?.titleListItemSearch?.edges || [];
        const metas = edges.map(edge => ({
            id: edge.node.title.id,
            name: edge.node.title.id
        }));

        return metas;
    } catch (error) {
        console.error(`GraphQL fetch failed for list ${listId}:`, error.message);
        
        // Fallback HTML regex scraper if GraphQL endpoint throttles
        try {
            const fallbackUrl = `https://www.imdb.com/list/${listId}/`;
            const htmlRes = await axios.get(fallbackUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                }
            });
            const matches = htmlRes.data.match(/tt\d{7,8}/g) || [];
            const uniqueIds = [...new Set(matches)];
            return uniqueIds.map(id => ({ id, name: id }));
        } catch (e) {
            return [];
        }
    }
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
