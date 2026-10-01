const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Robust IMDb List Fetcher
async function getImdbListItems(listId) {
    try {
        // Step 1: Query IMDb suggestion API with list ID
        const url = `https://v3.sg.media-imdb.com/suggestion/${listId.substring(0, 1)}/${listId}.json`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            },
            timeout: 5000
        });

        if (response.data && response.data.d) {
            const items = response.data.d;
            return items.map(item => ({ id: item.id, name: item.l || item.id }));
        }
    } catch (e) {
        console.log(`Suggestion API bypassed, using fallback HTML parsing for ${listId}...`);
    }

    // Fallback: Query HTML with custom search headers
    try {
        const htmlUrl = `https://www.imdb.com/list/${listId}/`;
        const response = await axios.get(htmlUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 5000
        });

        const matches = response.data.match(/tt\d{7,8}/g) || [];
        const uniqueIds = [...new Set(matches)];
        return uniqueIds.map(id => ({ id: id, name: id }));
    } catch (error) {
        console.error(`Failed fetching list ${listId}:`, error.message);
        return [];
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

// Catalog Route - Extracts items for both Movies and Series
app.get('/:lsCode/catalog/:type/:catalogId*', async (req, res) => {
    const lsCode = req.params.lsCode;
    const reqType = req.params.type;
    
    const rawItems = await getImdbListItems(lsCode);
    
    // Assign requested type dynamically to serve movies and series seamlessy
    const metas = rawItems.map(item => ({
        id: item.id,
        type: reqType,
        name: item.name
    }));

    res.json({ metas });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
