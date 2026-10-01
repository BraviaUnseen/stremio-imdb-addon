const { addonBuilder, getRouter } = require("stremio-addon-sdk");
const express = require("express");

// 1. Your newly updated extracted IMDb IDs
const IMDB_IDS = [
    "tt44568097", "tt41559858", "tt6933238", "tt39667834", "tt16478058", "tt38616652", 
    "tt38267923", "tt38061210", "tt33354945", "tt44322266", "tt44535692", "tt39750720", 
    "tt32889884", "tt33565722", "tt43657327", "tt11561116", "tt37275992", "tt39260895", 
    "tt39390497", "tt38662472", "tt36590417", "tt39741670", "tt42186253", "tt32268156", 
    "tt43640198", "tt41111628", "tt36304003", "tt39749953", "tt43617119", "tt37042085", 
    "tt39370887", "tt39632269", "tt39385949", "tt32278481", "tt36619926", "tt42037166", 
    "tt42863533", "tt40618609", "tt42456008", "tt42192165", "tt34888871", "tt10375624", 
    "tt36876775", "tt32150360", "tt38681832", "tt33397980", "tt37961742", "tt32129938", 
    "tt33538438", "tt41559880", "tt33098576", "tt40792117", "tt37024319", "tt39382052", 
    "tt34611082", "tt39664733", "tt42192201", "tt33100314", "tt39749979", "tt29552248", 
    "tt31116965", "tt43122943", "tt41559856", "tt39444813", "tt42063852", "tt39314348", 
    "tt37172278", "tt32572716", "tt31828554", "tt16431404", "tt37540875", "tt40891145", 
    "tt34498610", "tt32362890", "tt39751309", "tt38589464", "tt39773309", "tt38681815", 
    "tt39465484", "tt5562070", "tt40816715", "tt39578551", "tt36971084", "tt39345599", 
    "tt31806052", "tt39792948", "tt32155665", "tt39744394", "tt15574124", "tt38674977", 
    "tt15940132", "tt37800570", "tt36590322", "tt39162904", "tt39389929", "tt39631179", 
    "tt39387657", "tt33474179", "tt28793125", "tt33603921", "tt39369643", "tt39196792", 
    "tt39354078", "tt39320452", "tt39140662", "tt39240255", "tt36741457", "tt36398562", 
    "tt38872297", "tt32642706", "tt22740896", "tt39307872", "tt39115217", "tt39049795", 
    "tt37660887", "tt35295747", "tt38985973", "tt38984577", "tt35631328", "tt38644597", 
    "tt35766629", "tt29927663", "tt37443891", "tt37961727", "tt34762360", "tt14364480", 
    "tt38938597", "tt35668447", "tt38895441", "tt38681567", "tt38907962", "tt30446847", 
    "tt38884553", "tt35219851", "tt29232158", "tt10101702", "tt38061951", "tt37677952", 
    "tt35307143", "tt31137117", "tt34963797", "tt38772659", "tt35627915", "tt24852126", 
    "tt29768334", "tt31226985", "tt33402908", "tt33053440", "tt34433451", "tt27604215", 
    "tt35669044", "tt34992378", "tt33293169", "tt35713227", "tt1312221", "tt29247040", 
    "tt38221275", "tt38458157", "tt38457052", "tt38504137", "tt38348802", "tt34962891", 
    "tt38466379", "tt38203421", "tt32063098", "tt32376165", "tt32643830", "tt0498396", 
    "tt32129665", "tt33550069", "tt38095263", "tt38366532", "tt36265413", "tt35669054", 
    "tt7130300", "tt34682204", "tt32549601", "tt32985279", "tt38356685", "tt37996139", 
    "tt32306048", "tt33312131", "tt32360696", "tt36754289", "tt35669032", "tt33039440", 
    "tt35652650", "tt35076553", "tt37649515", "tt37674426", "tt37738599", "tt33293194", 
    "tt37670615", "tt30835190", "tt37543886", "tt33549683", "tt12001534", "tt37727295", 
    "tt37038661", "tt34691776", "tt35657531", "tt36711248", "tt32543884", "tt31567422", 
    "tt8785038", "tt4978342", "tt37433245", "tt35668659", "tt37333173", "tt37388226", 
    "tt30012657", "tt29383300", "tt31868189", "tt35668683", "tt32237537", "tt37457638", 
    "tt33299083", "tt27675583", "tt33888131", "tt31806049", "tt35669009", "tt14961624", 
    "tt36856538", "tt36856514", "tt36856496", "tt36856482", "tt32307524", "tt36856455", 
    "tt37024060", "tt36856306", "tt36856278", "tt10727696", "tt14205554", "tt35630700", 
    "tt32550101", "tt36240772", "tt31408343", "tt36473825", "tt35445387", "tt35628532", 
    "tt34682248", "tt36592065", "tt36462227", "tt33244550", "tt28664733", "tt33474172", 
    "tt32598081", "tt31433402", "tt28309594", "tt29768333", "tt1856010", "tt2309295", 
    "tt2372162", "tt2189461", "tt3520702", "tt3322312", "tt2431438", "tt2707408", 
    "tt2357547", "tt4592410", "tt3322314", "tt4635282", "tt4834206", "tt3322310", 
    "tt1837492", "tt6928052", "tt5503718", "tt6076336", "tt5290382", "tt5675620", 
    "tt2261227", "tt6297682", "tt5232792", "tt7692572", "tt8021824", "tt7569592", 
    "tt8714904", "tt6898970", "tt8295472", "tt7949204", "tt8778064", "tt8860450", 
    "tt9134194", "tt8652642", "tt6905542", "tt9348692", "tt8509922", "tt7403736", 
    "tt7913450", "tt7671598", "tt9117054", "tt8826128", "tt9698480", "tt9426290", 
    "tt8741648", "tt8403664", "tt9827854", "tt9073958", "tt12574336", "tt8210856", 
    "tt8787802", "tt12313074", "tt10473150", "tt1758589", "tt9421868", "tt10767748", 
    "tt12083014", "tt10893694", "tt5774002", "tt9073940", "tt1267295", "tt4160920", 
    "tt3339966", "tt4341500", "tt4861760", "tt4574708", "tt4061080", "tt3986586", 
    "tt4973548", "tt5228026", "tt4998212", "tt4789300", "tt5562056", "tt5467814", 
    "tt5937754", "tt5339440", "tt5580540", "tt5706996", "tt5707802", "tt5770786", 
    "tt5565334", "tt6315640", "tt5884792", "tt6877772", "tt3713588", "tt7078710", 
    "tt7879820", "tt6916746", "tt7661368", "tt6487482", "tt7183074", "tt7768010", 
    "tt8001718", "tt7255502", "tt8304498", "tt8009602", "tt9039142", "tt8164794", 
    "tt7718088", "tt10186846", "tt9098432", "tt8403536", "tt9717424", "tt7971476", 
    "tt8880894", "tt8755226", "tt9770286", "tt10675488", "tt8404094", "tt9850952", 
    "tt10540562", "tt10380934", "tt9446688", "tt11092086", "tt10726356", "tt10930958", 
    "tt10311562", "tt12800428", "tt10584608", "tt10183988", "tt9310390", "tt10151772", 
    "tt13316746", "tt10971022", "tt11717394", "tt13018090", "tt5435008", "tt5669272", 
    "tt4230076", "tt5516154", "tt5580146", "tt6763664", "tt7137906", "tt7087260", 
    "tt9067020", "tt7909970", "tt8771910", "tt9815454", "tt7322210", "tt10970552", 
    "tt10048342", "tt9698442", "tt9569546", "tt11343600", "tt10888878", "tt10574558", 
    "tt11337908", "tt12624928", "tt13655456", "tt3398228", "tt4326894", "tt7343832", 
    "tt8912244", "tt9814900", "tt8036272", "tt11639414", "tt9077562", "tt9308682", 
    "tt6517102", "tt6660498", "tt8116380", "tt7415066", "tt7211600", "tt6357658", 
    "tt9316078", "tt9348716", "tt9348718", "tt6908976", "tt9058134", "tt5066664", 
    "tt10106108", "tt10380814", "tt10619444", "tt11163352", "tt9288892", "tt12031040", 
    "tt9789660", "tt9731266", "tt10011298", "tt3010520", "tt3692064", "tt3807022", 
    "tt3807034", "tt4995636", "tt4816058", "tt1396212", "tt5021206", "tt4210022", 
    "tt4680360", "tt5193172", "tt5075942", "tt6464612", "tt5462936", "tt5580664", 
    "tt1870073", "tt5759196", "tt5846856", "tt6035850", "tt5916218", "tt5874596", 
    "tt4588068", "tt1734135", "tt6216718", "tt6495788", "tt6562134", "tt5038900", 
    "tt6591468", "tt6710836", "tt6865906", "tt5607658", "tt7322926", "tt3869122", 
    "tt6214876", "tt7620702", "tt1379164", "tt7539608", "tt4781350", "tt7924854", 
    "tt7741824", "tt6714408", "tt9315892", "tt6193336", "tt7758552", "tt7741830", 
    "tt8697554", "tt9077194", "tt7745956", "tt9203064", "tt8959860", "tt7736544", 
    "tt5621544", "tt7042146", "tt9817288", "tt10050752", "tt10370958", "tt10522374", 
    "tt8009622", "tt10687624", "tt9165404", "tt8914012", "tt10687134", "tt10228032", 
    "tt10987498", "tt8322592", "tt10482560", "tt7697062", "tt11738790", "tt11829340", 
    "tt11942070", "tt8115688", "tt0111161"
];

// 2. Addon Manifest
const manifest = {
    id: "org.imdb.ls093971121",
    version: "1.0.0",
    name: "My Custom IMDb List",
    description: "A custom curated catalog from IMDb ls093971121",
    catalogs: [
        {
            type: "movie",
            id: "imdb_custom_list",
            name: "IMDb Custom List"
        },
        {
            type: "series",
            id: "imdb_custom_list",
            name: "IMDb Custom List"
        }
    ],
    resources: ["catalog"],
    types: ["movie", "series"],
    idPrefixes: ["tt"]
};

const builder = new addonBuilder(manifest);

// 3. Memory Cache for Stremio MetaPreview objects
const cache = {
    movie: [],
    series: []
};

// Helper: Fetch and format metadata from Stremio's Cinemeta API
async function fetchCinemeta(id) {
    try {
        let res = await fetch(`https://v3-cinemeta.strem.io/meta/movie/${id}.json`);
        let data = await res.json();
        if (data && data.meta) return { ...data.meta, type: 'movie' };

        res = await fetch(`https://v3-cinemeta.strem.io/meta/series/${id}.json`);
        data = await res.json();
        if (data && data.meta) return { ...data.meta, type: 'series' };
    } catch (err) {
        console.error(`[Cinemeta Error] Failed to fetch ${id}`);
    }
    return null;
}

// 4. Pre-warm cache on server startup
async function buildCache() {
    console.log(`Building catalog cache for ${IMDB_IDS.length} items from Cinemeta...`);
    for (const id of IMDB_IDS) {
        const meta = await fetchCinemeta(id);
        if (meta) {
            cache[meta.type].push({
                id: meta.id,
                type: meta.type,
                name: meta.name,
                poster: meta.poster,
                description: meta.description,
                releaseInfo: meta.releaseInfo
            });
        }
    }
    console.log(`✅ Cache built! Loaded ${cache.movie.length} Movies and ${cache.series.length} Series.`);
}

// 5. Catalog Handler
builder.defineCatalogHandler(({ type, id, extra }) => {
    if (id === "imdb_custom_list" && cache[type]) {
        const skip = extra.skip ? parseInt(extra.skip) : 0;
        const metas = cache[type].slice(skip, skip + 100); 
        return Promise.resolve({ metas });
    }
    return Promise.resolve({ metas: [] });
});

// 6. Initialize Express App
const app = express();
const addonInterface = builder.getInterface();

app.use("/", getRouter(addonInterface));

const PORT = process.env.PORT || 7000;

app.listen(PORT, async () => {
    console.log(`Addon running at: http://localhost:${PORT}/manifest.json`);
    await buildCache();
});

// For Vercel/Serverless exports
module.exports = app;
