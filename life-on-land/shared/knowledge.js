// Curated, cited knowledge base for Canopy (UN SDG 15: Life on Land).
// Shared by the browser (offline answers) and the Pages Function (grounding for the AI model).
// Keep every statistic traceable to one of the SOURCES below.

export const SOURCES = {
  unSdg15: {
    title: 'UN SDG 15 Life on Land (UN South Africa)',
    url: 'https://southafrica.un.org/en/sdgs/15',
  },
  unstatsExtended: {
    title: 'UN Statistics Division: SDG Extended Report 2022, Goal 15',
    url: 'https://unstats.un.org/sdgs/report/2022/extended-report/Extended-Report_Goal-15.pdf',
  },
  fraKeyFindings: {
    title: 'FAO Global Forest Resources Assessment 2020: Key Findings',
    url: 'https://openknowledge.fao.org/server/api/core/bitstreams/9f24d451-2e56-4ae2-8a4a-1bc511f5e60e/content',
  },
  unNewsDeforestation: {
    title: 'UN News: Deforestation has slowed down but still remains a concern (2020)',
    url: 'https://news.un.org/en/story/2020/07/1068761',
  },
  ipbes2019: {
    title: 'IPBES 2019 Global Assessment, as reported by National Geographic',
    url: 'https://www.nationalgeographic.com/environment/article/ipbes-un-biodiversity-report-warns-one-million-species-at-risk',
  },
  unccdSdg15: {
    title: 'UNCCD: Why SDG 15 Life on Land matters (compilation of resources)',
    url: 'https://catalogue.unccd.int/159_Loose_leaf_SDG15_why_it_matters_compilation_of_resources_%20references.pdf',
  },
  isfr2023: {
    title: 'India State of Forest Report 2023 (summary by Next IAS)',
    url: 'https://www.nextias.com/ca/current-affairs/23-12-2024/india-state-of-forest-report-2023',
  },
  unDecadeRestoration: {
    title: 'UN Decade on Ecosystem Restoration 2021–2030',
    url: 'https://www.decadeonrestoration.org/',
  },
  unescoWesternGhats: {
    title: 'UNESCO World Heritage List: Western Ghats',
    url: 'https://whc.unesco.org/en/list/1342/',
  },
};

// Each entry: id, title, body (plain-language facts), tags (extra search terms), source key.
export const KNOWLEDGE = [
  {
    id: 'sdg15-overview',
    title: 'What is SDG 15, Life on Land?',
    body: 'SDG 15 aims to protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, halt and reverse land degradation, and halt biodiversity loss. It is one of the 17 UN Sustainable Development Goals.',
    tags: ['sdg', 'goal', 'life', 'land', 'biodiversity', 'ecosystem'],
    source: 'unSdg15',
  },
  {
    id: 'target-15-1',
    title: 'Target 15.1: Conserve terrestrial and freshwater ecosystems',
    body: 'Target 15.1 seeks to ensure the conservation, restoration and sustainable use of terrestrial and inland freshwater ecosystems and their services, in particular forests, wetlands, mountains and drylands, in line with international agreements.',
    tags: ['wetlands', 'freshwater', 'drylands', 'mountains', 'ecosystem services'],
    source: 'unSdg15',
  },
  {
    id: 'target-15-2',
    title: 'Target 15.2: Sustainable forest management',
    body: 'Target 15.2 aims to promote sustainable management of all types of forests, halt deforestation, restore degraded forests and substantially increase afforestation and reforestation globally.',
    tags: ['forest', 'forests', 'deforestation', 'afforestation', 'reforestation', 'trees', 'planting'],
    source: 'unSdg15',
  },
  {
    id: 'target-15-3',
    title: 'Target 15.3: Land degradation neutrality',
    body: 'Target 15.3 aims to combat desertification, restore degraded land and soil, including land affected by drought and floods, and strive for a land degradation-neutral world by 2030. Land degradation neutrality means the amount of healthy, productive land stays stable or grows.',
    tags: ['desertification', 'soil', 'degradation', 'drought', 'erosion', 'restoration'],
    source: 'unSdg15',
  },
  {
    id: 'target-15-4',
    title: 'Target 15.4: Mountain ecosystems',
    body: 'Target 15.4 focuses on conserving mountain ecosystems, including their biodiversity, so they can keep providing the benefits that sustainable development depends on, such as water and soil protection.',
    tags: ['mountain', 'mountains', 'highlands', 'hills', 'western ghats', 'sahyadri'],
    source: 'unSdg15',
  },
  {
    id: 'target-15-5',
    title: 'Target 15.5: Halt biodiversity loss and protect threatened species',
    body: 'Target 15.5 calls for urgent and significant action to reduce the degradation of natural habitats, halt the loss of biodiversity, and protect threatened species from extinction. Its indicator is the Red List Index, which tracks extinction risk.',
    tags: ['biodiversity', 'extinction', 'threatened', 'endangered', 'habitat', 'species', 'red list'],
    source: 'unstatsExtended',
  },
  {
    id: 'target-15-6',
    title: 'Target 15.6: Fair sharing of genetic resource benefits',
    body: 'Target 15.6 promotes the fair and equitable sharing of benefits from the use of genetic resources, such as plants and animals used for medicines, food and research, and appropriate access to those resources, as internationally agreed.',
    tags: ['genetic', 'genes', 'benefit sharing', 'access', 'medicine', 'traditional knowledge'],
    source: 'unSdg15',
  },
  {
    id: 'target-15-7',
    title: 'Target 15.7: End poaching and wildlife trafficking',
    body: 'Target 15.7 calls for urgent action to end poaching and trafficking of protected species of plants and animals, and to address both the demand for and supply of illegal wildlife products.',
    tags: ['poaching', 'poacher', 'trafficking', 'smuggling', 'illegal', 'wildlife crime', 'ivory', 'tiger'],
    source: 'unSdg15',
  },
  {
    id: 'target-15-8',
    title: 'Target 15.8: Invasive alien species',
    body: 'Target 15.8 aims to prevent the introduction of invasive alien species and significantly reduce their impact on land and water ecosystems, and to control or eradicate priority species. In India, examples often cited include Lantana camara, Parthenium hysterophorus and Prosopis juliflora.',
    tags: ['invasive', 'alien', 'lantana', 'parthenium', 'prosopis', 'weeds', 'weed', 'non-native'],
    source: 'unSdg15',
  },
  {
    id: 'target-15-9',
    title: 'Target 15.9: Biodiversity in planning and national accounts',
    body: 'Target 15.9 asks countries to integrate ecosystem and biodiversity values into national and local planning, development processes, poverty reduction strategies and accounts.',
    tags: ['planning', 'policy', 'accounts', 'government', 'development', 'city planning', 'urban'],
    source: 'unstatsExtended',
  },
  {
    id: 'forest-stats',
    title: 'Global forest facts (FAO, FRA 2020)',
    body: 'The world has 4.06 billion hectares of forest, about 31% of total land area. Deforestation was estimated at 10 million hectares per year in 2015–2020, down from 12 million in 2010–2015. Net forest loss was 4.7 million hectares per year in 2010–2020. About 420 million hectares of forest have been lost to deforestation since 1990.',
    tags: ['statistics', 'stats', 'data', 'numbers', 'hectares', 'how much', 'percent', 'world forest', 'left', 'remaining', 'amount', 'total', 'area', 'global', 'world', 'lost', 'loss', 'size'],
    source: 'fraKeyFindings',
  },
  {
    id: 'forest-protection',
    title: 'Protected forests',
    body: 'FAO reports that the area of forest in protected areas reached about 726 million hectares, nearly 200 million hectares more than in 1990. Protection alone is not enough; forests also need to be managed sustainably and restored where they have been degraded.',
    tags: ['protected', 'reserve', 'national park', 'sanctuary', 'conservation area'],
    source: 'unNewsDeforestation',
  },
  {
    id: 'biodiversity-stats',
    title: 'Biodiversity under pressure (IPBES 2019)',
    body: 'The IPBES 2019 global assessment estimates that around 1 million animal and plant species are threatened with extinction, more than ever before in human history. About 75% of the land-based environment has been significantly altered by humans. The main drivers are changes in land and sea use, including deforestation, followed by direct exploitation, climate change, pollution and invasive species.',
    tags: ['extinction', 'species', 'loss', 'crisis', 'drivers', 'why', 'million species'],
    source: 'ipbes2019',
  },
  {
    id: 'forests-and-people',
    title: 'Forests and people',
    body: 'Around 1.6 billion people depend on forests for their livelihood, including some 70 million indigenous people. Forests are home to more than 80% of all terrestrial species of animals, plants and insects.',
    tags: ['livelihood', 'livelihoods', 'indigenous', 'communities', 'people', 'income', 'jobs'],
    source: 'unccdSdg15',
  },
  {
    id: 'land-degradation-food',
    title: 'Land, soil and food',
    body: 'According to UNCCD, 52% of the land used for agriculture is moderately or severely affected by soil degradation. Land degradation affected about 1.5 billion people as of 2008, and 74% of poor people are directly affected by land degradation. Healthy soil, diverse farming and reduced chemical use help keep land productive.',
    tags: ['soil', 'farming', 'agriculture', 'food security', 'crops', 'fertiliser', 'fertilizer'],
    source: 'unccdSdg15',
  },
  {
    id: 'india-forest-cover',
    title: 'India forest and tree cover (ISFR 2023)',
    body: 'The India State of Forest Report 2023 found forest and tree cover of 8,27,357 sq km, which is 25.17% of India’s geographical area. Forest cover is 21.76% and tree cover is 3.41%. The 1988 National Forest Policy aims for 33% of the land area under forest and tree cover.',
    tags: ['india', 'indian', 'isfr', 'forest survey', 'national forest policy', 'country', 'tree cover', 'forest cover'],
    source: 'isfr2023',
  },
  {
    id: 'maharashtra-forests',
    title: 'Maharashtra forests',
    body: 'According to ISFR 2023, Maharashtra has about 65,383 sq km of forest and tree cover, the third-largest area among Indian states after Madhya Pradesh and Arunachal Pradesh. Maharashtra’s Western Ghats and Sahyadri hills are important for biodiversity and water.',
    tags: ['maharashtra', 'pune', 'pimpri', 'sahyadri', 'mumbai', 'state', 'local'],
    source: 'isfr2023',
  },
  {
    id: 'western-ghats',
    title: 'The Western Ghats',
    body: 'The Western Ghats are a biodiversity hotspot that stretches along India’s west coast and is a UNESCO World Heritage Site. They are home to many endemic plants and animals and act as a major source of rivers and rainfall for peninsular India.',
    tags: ['western ghats', 'ghats', 'hotspot', 'endemic', 'sahyadri', 'kerala', 'karnataka', 'goa'],
    source: 'unescoWesternGhats',
  },
  {
    id: 'native-planting',
    title: 'Planting the right trees',
    body: 'Native trees and plants suited to local soil and rainfall usually support more wildlife and survive better than fast-growing monocultures. Planting trees is most helpful when the trees are protected and cared for during the first few years. Avoid planting invasive species.',
    tags: ['plant', 'planting', 'sapling', 'native', 'tree', 'garden', 'monoculture', 'seedlings', 'how to plant'],
    source: 'unSdg15',
  },
  {
    id: 'restoration',
    title: 'Ecosystem restoration',
    body: 'The UN Decade on Ecosystem Restoration runs from 2021 to 2030. It encourages people to restore degraded forests, wetlands, grasslands and other ecosystems, which helps biodiversity, climate resilience and livelihoods.',
    tags: ['restore', 'restoration', 'degraded', 'rewilding', 'decade', 'rehabilitate'],
    source: 'unDecadeRestoration',
  },
  {
    id: 'sustainable-products',
    title: 'Choosing products that protect forests',
    body: 'Look for certified wood and paper, such as FSC or PEFC labels, to show that the timber came from responsibly managed forests. For palm oil, look for RSPO certification. Reducing paper waste and buying less cattle-based beef also lowers pressure on forests.',
    tags: ['certified', 'fsc', 'pefc', 'rspo', 'palm oil', 'wood', 'paper', 'timber', 'furniture', 'beef', 'shopping', 'consumer', 'buy'],
    source: 'unSdg15',
  },
  {
    id: 'wildlife-friendly',
    title: 'Living alongside wildlife',
    body: 'Do not feed wild animals, since it changes their behaviour and can cause conflict. Secure household waste so animals do not scavenge it, reduce outdoor lighting at night, and keep pets from chasing wildlife. Drive slowly in areas where animals cross roads.',
    tags: ['wildlife', 'animals', 'feeding', 'leopard', 'monkey', 'human wildlife conflict', 'night', 'light pollution', 'pets', 'home', 'house', 'garden', 'near', 'nearby', 'backyard', 'protect', 'protection', 'neighbourhood', 'bins', 'waste'],
    source: 'unSdg15',
  },
  {
    id: 'community-action',
    title: 'Community action for land and forests',
    body: 'Local groups can run tree planting and care drives, clean up wetlands, report illegal logging or wildlife crime to authorities, and take part in public consultations about development projects. Working with local forest departments and residents usually gives the best results.',
    tags: ['volunteer', 'volunteering', 'community', 'drive', 'report', 'ngo', 'join', 'action', 'get involved', 'activism'],
    source: 'unSdg15',
  },
  {
    id: 'citizen-science',
    title: 'Citizen science and species identification',
    body: 'Apps such as iNaturalist let anyone record plants, animals and fungi and share them with experts. These records help scientists track species, and AI image recognition can suggest identifications that people then confirm. Always check AI suggestions with an expert before relying on them.',
    tags: ['inaturalist', 'identify', 'identification', 'species', 'camera trap', 'record', 'app', 'ai', 'machine learning', 'monitoring'],
    source: 'unSdg15',
  },
  {
    id: 'ai-for-land',
    title: 'How AI supports Life on Land',
    body: 'AI helps conservation by analysing satellite images to detect forest loss early, identifying animals in camera-trap photos and audio recordings, forecasting fire and drought risk, and modelling restoration options. Its results are only as good as the data behind them, so human checks and local knowledge remain essential.',
    tags: ['ai', 'artificial intelligence', 'machine learning', 'satellite', 'technology', 'remote sensing', 'drones', 'data'],
    source: 'unSdg15',
  },
  {
    id: 'forest-rights',
    title: 'Forest-dependent communities in India',
    body: 'The Scheduled Tribes and Other Traditional Forest Dwellers (Recognition of Forest Rights) Act, 2006, recognises the rights of forest-dwelling communities to use and manage forest resources. Forest-dependent people are important partners in conservation.',
    tags: ['forest rights', 'tribal', 'adivasi', 'fra', 'act', 'law', 'policy', 'india'],
    source: 'unSdg15',
  },
  {
    id: 'wildlife-law',
    title: 'Wildlife protection in India',
    body: 'The Wildlife (Protection) Act, 1972 provides legal protection for wild animals and plants, and sets penalties for poaching and illegal trade in wildlife. Reporting suspected wildlife crime to the local forest department is an important way for citizens to help.',
    tags: ['wildlife protection act', 'law', 'legal', 'penalty', 'crime', 'report', 'india', 'forest department'],
    source: 'unSdg15',
  },
];

export const SUGGESTED_QUESTIONS = [
  'What is SDG 15 Life on Land?',
  'How much forest is left in the world?',
  'What is the situation of forests in India?',
  'What are invasive species and why do they matter?',
  'How can I help protect wildlife near my home?',
  'How can AI help protect forests?',
];
