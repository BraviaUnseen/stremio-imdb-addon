const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 7000;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Resilient regex scraper for IMDb list items
async function getImdbListItems(listId) {
    try {
        const url = `https://www.imdb.com/list/${listId}/`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        // Extract all IMDb tt IDs (tt1234567) using regex from page source
        const html = response.data;
        const ttMatches = html.match(/tt\d{7,8}/g) || [];
        
        // Remove duplicate IDs
        const uniqueIds = [...new Set(ttMatches)];

        return uniqueIds.map(id => ({
            id: id,
            type: 'movie',
            name: id // Stremio automatically resolves title metadata using the IMDb ID
        }));
    } catch (error) {
        console.error(`Error scraping IMDb list ${listId}:`, error.message);
        return [];
    }
}

app.get('/', (req, res) => {
    res.send('IMDb Stremio Addon is active.');
});

// Stremio Manifest Route
app.get('/:lsCode/manifest.json', (req, res) => {
    const lsCode = req.params.lsCode;
    const manifest = {
        id: `org.custom.imdb.${lsCode}`,
        version: '1.0.0',
        name: `IMDb List (${lsCode})`,
        description: `Live IMDb catalog for list ${lsCode}`,
        resources: ['catalog'],
        types: ['movie'],
        catalogs: [
            {
                type: 'movie',
                id: `imdb_${lsCode}`,
                name: `IMDb: ${lsCode}`
            }
        ]
    };
    res.json(manifest);
});

// Stremio Catalog Route - matches Stremio request pattern
app.get('/:lsCode/catalog/movie/:catalogId', async (req, res) => {
    const lsCode = req.params.lsCode;
    const metas = await getImdbListItems(lsCode);
    res.json({ metas });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
