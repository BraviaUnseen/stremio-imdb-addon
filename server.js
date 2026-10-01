const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 7000;

// Enable CORS for Stremio client access
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});

// Helper function to scrape IMDb list items
async function getImdbListItems(listId) {
    try {
        const url = `https://www.imdb.com/list/${listId}/`;
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        const $ = cheerio.load(response.data);
        const metas = [];

        // Parse title IDs from the page
        $('[data-tconst]').each((i, element) => {
            const imdbId = $(element).attr('data-tconst');
            if (imdbId && !metas.some(item => item.id === imdbId)) {
                metas.push({
                    id: imdbId,
                    type: 'movie',
                    name: $(element).find('.ipc-title__text').text().replace(/^\d+\.\s*/, '') || 'Movie'
                });
            }
        });

        return metas;
    } catch (error) {
        console.error(`Error scraping IMDb list ${listId}:`, error.message);
        return [];
    }
}

// Landing page route
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

// Stremio Catalog Route
app.get('/:lsCode/catalog/movie/:catalogId.json', async (req, res) => {
    const lsCode = req.params.lsCode;
    const metas = await getImdbListItems(lsCode);
    res.json({ metas });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
