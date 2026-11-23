const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const NodeCache = require("node-cache");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DB ================= */

const db = mysql.createPool({
  host: "127.0.0.1",
  user: "nodeuser",
  password: "node123",
  database: "masalamobile_newDB",
  waitForConnections: true,
  connectionLimit: 10
});

const runQuery = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

/* ================= CACHE ================= */

const cache = new NodeCache({ stdTTL: 60 });

/* ================= LANGUAGE ================= */

const langMap = {
  en: "English",
  tl: "Telugu",
  hi: "Hindi"
};

/* ================= FETCH ALL POSTS (ONE QUERY) ================= */

const getAllPosts = async (language) => {
  return await runQuery(`
    SELECT 
      p.postid,
      p.posttitle,
      p.posttitle_new,
      p.imagepath,
      p.published_date,
      p.hashtag,
      c.categoryname,
      c.category_url
    FROM post p
    LEFT JOIN category c ON p.categoryid = c.categoryid
    WHERE p.status = 'Publish'
      AND (
  LOWER(p.language) = LOWER(?) 
  OR p.language IS NULL 
  OR p.language = ''
)
    ORDER BY p.published_date DESC
    LIMIT 8000
  `, [language]);
};

/* ================= FILTER HELPER ================= */

const filterPosts = (posts, condition, limit) => {
  return posts.filter(condition).slice(0, limit);
};

const mapPost = (p) => ({
  title: p.posttitle,
  post_url: p.posttitle_new,
  imagepath: p.imagepath,
  categoryurl: p.category_url
});

/* ================= HOMEPAGE ================= */


app.post("/:lang/homepage", async (req, res) => {
  try {
    const lang = req.params.lang || "en";
    const cacheKey = `home_${lang}`;

    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }

    const language = langMap[lang] || "English";

    /* ================= MAIN POSTS ================= */
    const posts = await runQuery(`
      SELECT 
        p.posttitle,
        p.posttitle_new,
        p.imagepath,
        p.hashtag,
        p.published_date,
        c.categoryname,
        c.category_url
      FROM post p
      LEFT JOIN category c ON p.categoryid = c.categoryid
      WHERE p.status = 'Publish'
        AND p.language = ?
      ORDER BY p.published_date DESC
      LIMIT 8000
    `, [language]);

    if (!posts.length) {
      return res.json({ status: 0 });
    }

    /* ================= HELPERS ================= */
    const mapPost = (p) => ({
      title: p.posttitle || "",
      post_url: p.posttitle_new || "#",
      imagepath: p.imagepath || "",
      categoryurl: p.category_url || "",
      categoryname: p.categoryname || ""
    });

    const filterPosts = (cond, limit) =>
      posts.filter(cond).slice(0, limit);

    /* ================= BASIC ================= */
    const hero = posts.slice(0, 5);
    const trending = posts.slice(0, 10);

    const filmgossip = filterPosts(p => p.category_url === "film-gossip", 8);
    const moviereview = filterPosts(p => p.category_url === "movie-review", 8);
    const tvlive = filterPosts(p => p.category_url === "tv-live", 8);
    const fashion = filterPosts(p => p.category_url === "fashion", 8);
    const music = filterPosts(p => p.category_url === "music", 8);
    const health = filterPosts(p => p.category_url === "health-wellness", 8);
    const sports = filterPosts(p => (p.category_url || "").includes("sport"), 8);
    const movies = filterPosts(p => (p.category_url || "").includes("movie"), 8);
    const techgadgets = filterPosts(p => p.category_url === "tech-gadgets", 8);
    const autoNews = filterPosts(p => p.category_url === "auto-news", 8);
    const travel = filterPosts(p => p.category_url === "travel", 8);
    const features = filterPosts(p => p.category_url === "features", 8);

    // const celebrities = filterPosts(
    //   p =>
    //     (p.category_url || "").toLowerCase() === "celebrities" ||
    //     (p.categoryname || "").toLowerCase().includes("celebrity"),
    //   12
    // );


const celebrities = filterPosts(
  p => {
    const url = (p.category_url || "").toLowerCase();
    const name = (p.categoryname || "").toLowerCase();

    return (
      url.includes("celeb") ||
      name.includes("celeb") ||
      name.includes("star")
    );
  },
  12
).map(p => {
  // 🔥 FORCE TITLE FROM SLUG
  let cleanTitle = "";

  if (p.posttitle && p.posttitle.trim() !== "") {
    cleanTitle = p.posttitle;
  } else if (p.posttitle_new) {
    cleanTitle = p.posttitle_new
      .replace(/-i\d+$/, "")   // remove -i123
      .replace(/-/g, " ");     // convert to spaces
  }

  return {
    title: cleanTitle || "Celebrity",
    imagepath: p.imagepath,

    // 🔥 ONLY THIS (NO post_url)
    search_url: cleanTitle
  };
});


    const biggboss = filterPosts(
      p => (p.hashtag || "").toLowerCase().includes("biggboss"),
      8
    );

    const temples = filterPosts(
      p => (p.hashtag || "").toLowerCase().includes("temple"),
      8
    );

   let tollywoodKaburulu = filterPosts(
  p => (p.category_url || "").includes("tollywood"),
  8
);

if (!tollywoodKaburulu.length) {
  tollywoodKaburulu = movies;
}

    /* ================= PAPARAZZI ================= */
    const numerologyRaw = await runQuery(`
      SELECT posttitle, posttitle_new, imagepath
      FROM paparazzi_post
      WHERE cat_type = 'numerology'
        AND status = 'Publish'
        AND (language = ? OR language IS NULL OR language = '')
      ORDER BY published_date DESC
      LIMIT 6
    `, [language]);

    const paparazziRaw = await runQuery(`
      SELECT posttitle, posttitle_new, imagepath
      FROM paparazzi_post
      WHERE cat_type = 'Paparazzi'
        AND status = 'Publish'
        AND (language = ? OR language IS NULL OR language = '')
      ORDER BY published_date DESC
      LIMIT 6
    `, [language]);

    const trailersRaw = await runQuery(`
      SELECT posttitle, posttitle_new, imagepath
      FROM paparazzi_post
      WHERE cat_type = 'Trailers'
        AND status = 'Publish'
        AND (language = ? OR language IS NULL OR language = '')
      ORDER BY published_date DESC
      LIMIT 6
    `, [language]);

    const numerology = numerologyRaw.map(p => ({
      title: p.posttitle,
      post_url: p.posttitle_new,
      imagepath: p.imagepath,
      categoryurl: "numerology"
    }));

    const paparazzi = paparazziRaw.map(p => ({
      title: p.posttitle,
      post_url: p.posttitle_new,
      imagepath: p.imagepath,
      categoryurl: "paparazzi"
    }));

    const trailers = trailersRaw.map(p => ({
      title: p.posttitle,
      post_url: p.posttitle_new,
      imagepath: p.imagepath,
      categoryurl: "trailers"
    }));

    /* ================= TRENDING TAG ================= */
    const trendingTagRaw = await runQuery(`
      SELECT hashtag, COUNT(*) as total
      FROM post
      WHERE status = 'Publish'
        AND language = ?
        AND hashtag IS NOT NULL
        AND hashtag != ''
      GROUP BY hashtag
      ORDER BY total DESC
      LIMIT 1
    `, [language]);

    let trendingTag = "";
    let trendingPosts = [];

    if (trendingTagRaw.length) {
      trendingTag = trendingTagRaw[0].hashtag;

      const tagPostsRaw = await runQuery(`
        SELECT 
          p.posttitle,
          p.posttitle_new,
          p.imagepath,
          c.category_url,
          c.categoryname
        FROM post p
        LEFT JOIN category c ON p.categoryid = c.categoryid
        WHERE p.status = 'Publish'
          AND p.language = ?
          AND LOWER(p.hashtag) LIKE ?
        ORDER BY p.published_date DESC
        LIMIT 8
      `, [language, `%${trendingTag.toLowerCase()}%`]);

      trendingPosts = tagPostsRaw.map(mapPost);
    }

    const featuredToday = posts.slice(0, 8).map(mapPost);

    /* ================= AUDIO ================= */
    const audioRaw = await runQuery(`
      SELECT posttitle, post_url, imagepath, videopath
      FROM articles
      WHERE status = 1
        AND language = ?
        AND categoryid = 66
      ORDER BY published_date DESC
      LIMIT 8
    `, [lang === "tl" ? 3 : 1]);

    const audioList = audioRaw.map(p => ({
      title: p.posttitle,
      post_url: p.post_url,
      imagepath: p.imagepath,
      videopath: p.videopath
    }));

    /* ================= NAV ================= */
    const navRows = await runQuery(`
      SELECT categoryname, category_url
      FROM category
      WHERE category_url IS NOT NULL
      ORDER BY categoryid ASC
    `);

    const navdata = navRows.map(c => ({
      title: c.categoryname,
      url: "/" + c.category_url
    }));

    /* ================= HOMEDATA ================= */
    let homedata = [];

    if (lang === "en") {
      homedata = [
        { type: "main-slider", list: hero.map(mapPost) },

        {
          type: "dark-block",
          title: `#${trendingTag || "Trending"}`,
          list: trendingPosts.length ? trendingPosts : trending.map(mapPost)
        },

        { type: "light-block", title: "Film Gossip", url: "/film-gossip", list: filmgossip.map(mapPost) },
        { type: "dark-block", title: "#Featured Today", list: featuredToday },
        { type: "light-block", title: "TV Live", url: "/tvlive", list: tvlive.map(mapPost) },
        { type: "celebrities-circle", title: "Celebrities", url: "/celebrities", list: celebrities },
        { type: "youtube-videos", title: "Numerology", url: "/numerology", list: numerology },
        { type: "trending-block", title: "Movie Review", url: "/movie-review", list: moviereview.map(mapPost) },
        { type: "dark-block", title: "Bigg Boss", url: "/biggboss", list: biggboss.map(mapPost) },
        { type: "light-block", title: "Movies", url: "/movies", list: movies.map(mapPost) },
        { type: "dark-block", title: "Fashion", url: "/fashion", list: fashion.map(mapPost) },
        { type: "dark-block", title: "Temples", url: "/temples", list: temples.map(mapPost) },
        { type: "light-block", title: "Music", url: "/music", list: music.map(mapPost) },
        { type: "light-block", title: "Health", url: "/health", list: health.map(mapPost) },
        { type: "youtube-videos", title: "Trailers", url: "/trailers", list: trailers },
        { type: "number-slider", title: "Sports", url: "/sports", list: sports.map(mapPost) },
        { type: "dark-block", title: "Tech Gadgets", url: "/tech-gadgets", list: techgadgets.map(mapPost) },
        { type: "youtube-videos", title: "Paparazzi", url: "/paparazzi", list: paparazzi },
         { type: "number-slider", title: "Auto News", url: "/auto-news", list: autoNews.map(mapPost) },
          { type: "light-block", title: "Travel", url: "/travel", list: travel.map(mapPost) }, 
          { type: "light-block", title: "Features", url: "/features", list: features.map(mapPost) }
      ];
    }

    else if (lang === "tl") {
         homedata = [
        { type: "main-slider", list: hero.map(mapPost) },

        {
          type: "dark-block",
          title: `#${trendingTag || "Trending"}`,
          list: trendingPosts
        },

        {
          type: "light-block",
          title: "టాలీవుడ్ కబుర్లు",
          url: "/tollywood-kaburulu",
          list: tollywoodKaburulu.map(mapPost)
        },

        {
          type: "audio-block",
          title: "రాశి ఫలాలు",
          url: "/audio-tl",
          list: audioList
        },

        {
          type: "light-block",
          title: "సినిమా",
          url: "/movies",
          list: movies.map(mapPost)
        },

        {
          type: "celebrities-circle",
          title: "సెలబ్రిటీలు",
          url: "/celebrities",
          list: celebrities
        },

        {
          type: "trending-block",
          title: "ఫిల్మ్ రివ్యూ",
          url: "/movie-review",
          list: moviereview.map(mapPost)
        },

        {
          type: "light-block",
          title: "స్పోర్ట్స్",
          url: "/sports",
          list: sports.map(mapPost)
        },

        {
          type: "light-block",
          title: "ఫిల్మ్ గాసిప్",
          url: "/film-gossip",
          list: filmgossip.map(mapPost)
        }
        , {
          type: "light-block",
          title: "సంగీతం",
          url: "/music",
          list: music.map(mapPost)
        }
        ,  {
          type: "youtube-videos",
          title: "ట్రైలర్స్",
          url: "/trailers",
          list: trailers.map(mapPost)
        }
      ];
    }

    else if (lang === "hi") {
  homedata = [
    {
      type: "main-slider",
      list: hero.map(mapPost)
    },

    {
      type: "dark-block",
      title: `#${trendingTag || "ट्रेंडिंग"}`,
      list: trendingPosts.length ? trendingPosts : trending.map(mapPost)
    },

    {
      type: "light-block",
      title: "फिल्मी गॉसिप",
      url: "/film-gossip",
      list: filmgossip.map(mapPost)
    },

    {
      type: "celebrities-circle",
      title: "सितारे",
      url: "/celebrities",
      list: celebrities
    },

    {
      type: "light-block",
      title: "टीवी Live",
      url: "/tvlive",
      list: tvlive.map(mapPost)
    },

    {
      type: "light-block",
      title: "सिनेमा",
      url: "/movies",
      list: movies.map(mapPost)
    },

    {
      type: "trending-block",
      title: "रिव्यु",
      url: "/movie-review",
      list: moviereview.map(mapPost)
    },

    {
      type: "dark-block",
      title: "फैशन",
      url: "/fashion",
      list: fashion.map(mapPost)
    },

    {
      type: "light-block",
      title: "हेल्थ",
      url: "/health",
      list: health.map(mapPost)
    },

    {
      type: "youtube-videos",
      title: "ट्रेलर",
      url: "/trailers",
      list: trailers
    },

    {
      type: "number-slider",
      title: "खेल",
      url: "/sports",
      list: sports.map(mapPost)
    },

    {
      type: "light-block",
      title: "टूरिज्म",
      url: "/travel",
      list: travel.map(mapPost)
    },

    {
      type: "dark-block",
      title: "तकनीकी",
      url: "/tech-gadgets",
      list: techgadgets.map(mapPost)
    },

    {
      type: "light-block",
      title: "फीचर",
      url: "/features",
      list: features.map(mapPost)
    },

    {
      type: "light-block",
      title: "म्यूजिक",
      url: "/music",
      list: music.map(mapPost)
    }
  ];
}

    /* ================= FINAL ================= */
    const response = {
      status: 1,
      data: {
        metadata: {
          title: "Mobile Masala",
          description: "Latest News"
        },
        navdata,
        homedata
      }
    };

    cache.set(cacheKey, response);
    res.json(response);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(500).json({ status: 0 });
  }
});

/* ================= START ================= */
/* ================= ARTICLE API ================= */

const createSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

/* ================= ARTICLE API ================= */


app.post("/:lang/article", async (req, res) => {
  try {
    const { articlename, storyid } = req.body;
    const lang = (req.params.lang || "en").toLowerCase();

    const id = storyid || articlename;

    if (!id) {
      return res.status(400).json({ status: 0 });
    }

    const language = langMap[lang] || "English";

    /* =========================================================
       ✅ 1. VISUAL STORY (FIRST PRIORITY 🔥)
    ========================================================= */

    const story = await runQuery(`
      SELECT storyid, storytitle
      FROM v_stories
      WHERE storyid = ? OR storytitle_new = ?
      LIMIT 1
    `, [id, articlename]);

    if (story.length > 0) {

      const imagesRows = await runQuery(`
        SELECT 
          t_imagelink_new AS image,
          t_description AS title
        FROM visual_stories_images
        WHERE postid = ?
          AND t_status = 'Active'
        ORDER BY imageid ASC
      `, [story[0].storyid]);

      if (imagesRows.length > 0) {
        return res.json({
          status: 1,
          data: {
            metadata: {
              title: story[0].storytitle,
              description: story[0].storytitle
            },
            articledata: {
              type: "visualstory",
              postid: story[0].storyid,
              title: story[0].storytitle,
              images: imagesRows
            }
          }
        });
      }
    }

    /* =========================================================
       ✅ 2. VIDEO
    ========================================================= */

    let articleRows = await runQuery(`
      SELECT 
        postid, posttitle, posttitle_new, description,
        imagepath, videopath, published_date, hitcount, cat_type
      FROM paparazzi_post
      WHERE posttitle_new = ?
        AND status = 'Publish'
        AND (language = ? OR language IS NULL OR language = '')
      LIMIT 1
    `, [articlename, language]);

    let isVideoContent = articleRows.length > 0;

    /* =========================================================
       ✅ 3. NORMAL ARTICLE
    ========================================================= */

    if (!articleRows.length) {
      articleRows = await runQuery(`
        SELECT 
          p.postid, p.posttitle, p.posttitle_new, p.description,
          p.imagepath, p.published_date, p.hitcount, p.hashtag, p.categoryid,
          c.categoryname, c.category_url
        FROM post p
        LEFT JOIN category c ON p.categoryid = c.categoryid
        WHERE p.posttitle_new = ?
          AND p.status = 'Publish'
          AND (p.language = ? OR p.language IS NULL OR p.language = '')
        LIMIT 1
      `, [articlename, language]);
    }

    if (!articleRows.length) {
      return res.json({ status: 0 });
    }

    const a = articleRows[0];

    const hashtags = a.hashtag
  ? a.hashtag.split(',').map(tag => ({
      keyword: tag.trim().replace('#', ''),
      title: tag.trim().replace('#', '')
    }))
  : [];

  
    
  /* ================= RELATED ARTICLES ================= */
    // Same category, exclude current article

const relatedRows = await runQuery(
  `
  SELECT 
    p.postid,
    p.posttitle,
    p.posttitle_new,
    p.imagepath,
    c.category_url,
    c.categoryname
  FROM post p
  LEFT JOIN category c ON p.categoryid = c.categoryid
  WHERE p.categoryid = ?
    AND p.postid != ?
    AND p.status = 'Publish'
    AND (p.language = ? OR p.language IS NULL OR p.language = '')
  ORDER BY p.published_date DESC
  LIMIT 8
  `,
  [a.categoryid, a.postid, language]
);

    const relatedarticledata = relatedRows.map(p => ({
  id: p.postid,
  title: p.posttitle,
  articleurl: p.posttitle_new,
  image: p.imagepath,
  categoryurl: p.category_url,        // ✅ FIX
  categorytitle: p.categoryname       // ✅ FIX
}));

    /* ================= TRENDING ARTICLES ================= */

  //   const hashtags = a.hashtag
  // ? a.hashtag.split(',').map(tag => ({
  //     keyword: tag.replace('#', '').trim(),
  //     title: tag.replace('#', '').trim()
  //   }))
  // : [];
  //   // Latest or highest views


const trendingRows = await runQuery(
  `
  SELECT 
    p.postid,
    p.posttitle,
    p.posttitle_new,
    p.imagepath,
    c.category_url,
    c.categoryname
  FROM post p
  LEFT JOIN category c ON p.categoryid = c.categoryid
  WHERE p.status = 'Publish'
    AND (p.language = ? OR p.language IS NULL OR p.language = '')
  ORDER BY p.published_date DESC
  LIMIT 8
  `,
  [language]
);

    const categoryarticle = trendingRows.map(p => ({
  id: p.postid,
  title: p.posttitle,
  articleurl: p.posttitle_new,
  image: p.imagepath,
  categoryurl: p.category_url,      // ✅ FIX
  categorytitle: p.categoryname     // ✅ FIX
}));

   return res.json({
  status: 1,
  data: {
    metadata: {
      title: a.posttitle,
      description: a.posttitle
    },
    relatedarticledata,
    categoryarticle,
    articledata: {
      type: "article",
      postid: a.postid,
      title: a.posttitle,
      description: a.description,
      image: a.imagepath,
      video: isVideoContent ? a.videopath : null,
  hashtags: hashtags  , // ✅ ADD THIS

      // ✅ ADD THESE
      date: a.published_date,
      views: a.hitcount || 0,
      categoryurl: a.category_url,
      categorytitle: a.categoryname,

    
    }
  }
});

  } catch (err) {
    console.error("❌ ERROR:", err);
    res.status(500).json({ status: 0 });
  }
});

/* ================= HELPER ================= */
const capitalize = (str = "") =>
  str.charAt(0).toUpperCase() + str.slice(1);

/* ================= START ================= */

app.post("/:lang/categorypage", async (req, res) => {
  try {
    /* ================= INPUT ================= */
    const langParam = (req.params.lang || "en").toLowerCase();
    const rawName = req.body?.name || req.query?.name;
    const page = parseInt(req.body?.page || req.query?.page || 1);

    if (!rawName) {
      return res.json({ status: 0, message: "Category required" });
    }

    /* ================= CLEAN SLUG ================= */
const name = (rawName || "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9-]/g, "-")
  .replace(/-+/g, "-");

      
const slugFixMap = {
  "tech-gadets": "tech-gadgets",
  "techgadets": "tech-gadgets",
  "tech&gadgets": "tech-gadgets",
  "film-events": "film-events",
  "rj-suneetha": "rj-suneetha-kaburulu"
};

const fixedName = slugFixMap[name] || name;
    /* ================= LANGUAGE ================= */
    const langMap = {
      en: "English",
      tl: "Telugu",
      hi: "Hindi",
      ta: "Tamil"
    };

    const language = langMap[langParam] || "English";

    const limit = 24;
    const offset = (page - 1) * limit;

    let posts = [];
    let total = 0;

    /* =========================================================
       ✅ CATEGORY SOURCE CONFIG
    ========================================================= */
    const paparazziMap = {
      "paparazzi": "Paparazzi",
      "numerology": "Numerology",
      "trailers": "Trailers",
      "rj-suneetha-kaburulu": "RJ Suneetha",
      "film-events": "Paparazzi"
    };

    /* =========================================================
       ✅ PHOTO STORIES
    ========================================================= */
  if (name === "photo-stories") {

  const rows = await runQuery(`
    SELECT 
      storyid AS postid,
      storytitle AS title,
      storytitle_new AS articleurl,
      imagelink_new AS image,
      language
    FROM v_stories
    WHERE cat_type = 'visualstories'
      AND (
        LOWER(language) = LOWER(?) 
        OR language IS NULL 
        OR language = ''
      )
    ORDER BY storyid DESC
    LIMIT ? OFFSET ?
  `, [language, limit, offset]);

  const count = await runQuery(`
    SELECT COUNT(*) as total 
    FROM v_stories 
    WHERE cat_type = 'visualstories'
      AND (
        LOWER(language) = LOWER(?) 
        OR language IS NULL 
        OR language = ''
      )
  `, [language]);

  total = count[0]?.total || 0;

  posts = rows.map(p => ({
    postid: p.postid,
    title: p.title,              // ✅ correct title
    articleurl: p.articleurl,   // ✅ slug
    image: p.image,
    categorytitle: "Photo Stories",
    categoryurl: "photo-stories"
  }));
}

    /* =========================================================
       ✅ PAPARAZZI / VIDEO CATEGORIES
    ========================================================= */
    else if (paparazziMap[name]) {

      const catType = paparazziMap[name];

      const rows = await runQuery(`
        SELECT 
          postid,
          posttitle AS title,
          imagepath AS image,
          videopath,
          posttitle_new AS articleurl,
          published_date
        FROM paparazzi_post
        WHERE LOWER(cat_type) = LOWER(?)
          AND status = 'Publish'
          AND (
            LOWER(language) = LOWER(?) 
            OR language IS NULL 
            OR language = ''
          )
        ORDER BY published_date DESC
        LIMIT ? OFFSET ?
      `, [catType, language, limit, offset]);

      const count = await runQuery(`
        SELECT COUNT(*) as total
        FROM paparazzi_post
        WHERE LOWER(cat_type) = LOWER(?)
          AND status = 'Publish'
          AND (
            LOWER(language) = LOWER(?) 
            OR language IS NULL 
            OR language = ''
          )
      `, [catType, language]);

      total = count[0]?.total || 0;

      posts = rows.map(p => ({
        postid: p.postid,
        title: p.title,
        articleurl: p.articleurl,
        image: p.image,
        video: p.videopath,
        categorytitle: catType,
        categoryurl: name
      }));
    }

    /* =========================================================
       ✅ NORMAL CATEGORY (POST TABLE)
    ========================================================= */
  else {

  const rows = await runQuery(`
    SELECT 
      p.postid,
      p.posttitle AS title,
      p.posttitle_new AS articleurl,
      p.imagepath AS image,
      c.categoryname,
      c.category_url
    FROM post p
    LEFT JOIN category c ON p.categoryid = c.categoryid
    WHERE LOWER(c.category_url) = LOWER(?)
      AND p.status = 'Publish'
      AND (
        LOWER(p.language) = LOWER(?) 
        OR p.language IS NULL 
        OR p.language = ''
      )
    ORDER BY p.published_date DESC
    LIMIT ? OFFSET ?
  `, [fixedName, language, limit, offset]);

  const count = await runQuery(`
    SELECT COUNT(*) as total
    FROM post p
    LEFT JOIN category c ON p.categoryid = c.categoryid
    WHERE LOWER(c.category_url) = LOWER(?)
      AND p.status = 'Publish'
      AND (
        LOWER(p.language) = LOWER(?) 
        OR p.language IS NULL 
        OR p.language = ''
      )
  `, [name, language]);

  total = count[0]?.total || 0;

  posts = rows.map(p => ({
    postid: p.postid,
    title: p.title,
    articleurl: p.articleurl,
    image: p.image,
    categorytitle: p.categoryname,
    categoryurl: p.category_url
  }));
}

    /* =========================================================
       ✅ GROUP (UI FORMAT)
    ========================================================= */
    const categorydata = [];
    for (let i = 0; i < posts.length; i += 4) {
      categorydata.push(posts.slice(i, i + 4));
    }

    /* =========================================================
       ✅ PAGINATION
    ========================================================= */
    const totalPages = Math.ceil(total / limit);
    const paginationurls = [];

    if (page > 1) paginationurls.push({ "<<": page - 1 });

    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
      paginationurls.push({ [i]: i });
    }

    if (page < totalPages) paginationurls.push({ ">>": page + 1 });

    /* =========================================================
       ✅ RESPONSE
    ========================================================= */
    res.json({
      status: 1,
      data: {
        metadata: {
          title: `${name} - Mobile Masala`,
          description: `Latest ${name} news`
        },
        pagetitle: name,
        categorydata,
        pagination: {
          paginationnumber: page,
          paginationurls
        }
      }
    });

  } catch (err) {
    console.error("❌ CATEGORY ERROR:", err);
    res.status(500).json({ status: 0 });
  }
});

app.get("/:lang/next-stories", async (req, res) => {
  try {
    const lang = req.params.lang || "en";
    const storyid = req.query.storyid;

    if (!storyid) {
      return res.json({ status: 0 });
    }

    const language = langMap[lang] || "English";

    const rows = await runQuery(`
      SELECT 
        storyid,
        storytitle,
        storytitle_new,
        imagelink_new,
        description
      FROM v_stories
      WHERE cat_type = 'visualstories'
        AND storyid < ?
        AND (language = ? OR language IS NULL OR language = '')
      ORDER BY storyid DESC
      LIMIT 1
    `, [storyid, language]);

    if (!rows.length) {
      return res.json({ status: 0 });
    }

    return res.json({
      status: 1,
      data: rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 0 });
  }
});
/* ================= SEARCH API (Optional but recommended) ================= */


app.get("/amp-story/:id/:slug", async (req, res) => {
  try {
    const id = req.params.id;

    const story = await runQuery(`
      SELECT storyid, storytitle, storytitle_new
      FROM v_stories
      WHERE storyid = ?
      LIMIT 1
    `, [id]);

    if (!story.length) return res.send("No Story Found");

    const images = await runQuery(`
      SELECT 
        t_imagelink_new AS image,
        t_description AS title
      FROM visual_stories_images
      WHERE postid = ?
      ORDER BY imageid ASC
    `, [id]);

    const next = await runQuery(`
      SELECT storyid, storytitle, storytitle_new, imagelink_new
      FROM v_stories
      WHERE storyid < ?
      ORDER BY storyid DESC
      LIMIT 1
    `, [id]);

    const nextStory = next[0];

    let pages = "";

    /* ================= STORY PAGES ================= */
    images.forEach((img, i) => {
      pages += `
      <amp-story-page id="page-${i}">

        <amp-story-grid-layer template="fill">
          <amp-img 
            src="${img.image}" 
            width="720" 
            height="1280" 
            layout="responsive">
          </amp-img>
        </amp-story-grid-layer>

                <amp-story-grid-layer template="vertical" class="align-end">

                  <div
                    animate-in="fly-in-bottom"
                    animate-in-duration="2s"
                    animate-in-delay="0.5s"
                    style="width:100%;"
                  >

                    <div class="text-box">
                      ${img.title || ""}
                    </div>

                  </div>

                </amp-story-grid-layer>

      </amp-story-page>`;
    });

    /* ================= NEXT STORY FULL PAGE ================= */
    if (nextStory) {
      pages += `
      <amp-story-page id="next-story">

        <amp-story-grid-layer template="fill">
          <amp-img 
            src="${nextStory.imagelink_new}" 
            width="720" 
            height="1280" 
            layout="responsive">
          </amp-img>
        </amp-story-grid-layer>

        <amp-story-grid-layer template="vertical">

          <div animate-in="fly-in-bottom"
               animate-in-duration="2s"
               animate-in-delay="0.5s"
               style="margin-top:auto;padding:20px;text-align:center;
               background:rgba(0,0,0,0.7);color:#fff;">

            <p style="font-size:14px;">Next Story</p>
            <h2 style="font-size:20px;">${nextStory.storytitle}</h2>

          </div>

        </amp-story-grid-layer>

        <amp-story-page-outlink layout="nodisplay">
          <a href="/amp-story/${nextStory.storyid}/${nextStory.storytitle_new}">
            Read Next
          </a>
        </amp-story-page-outlink>

      </amp-story-page>`;
    }

    res.send(`
<!doctype html>
<html ⚡>
<head>

<meta charset="utf-8">
<meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1">

<title>${story[0].storytitle}</title>

<link rel="canonical" href="/amp-story/${story[0].storyid}/${story[0].storytitle_new}" />

<script async src="https://cdn.ampproject.org/v0.js"></script>
<script async custom-element="amp-story"
src="https://cdn.ampproject.org/v0/amp-story-1.0.js"></script>

<style amp-boilerplate>
body{animation:-amp-start 8s steps(1,end) 0s 1 normal both}
@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}

.align-end {
  align-content: end;
  padding: 0; /* important */
}

.text-box {
  background: rgba(0,0,0,0.7);
  color: #fff;
  text-align: center;

  padding:60px 30px ;

  
  width: 100%;
  
  /* 👇 shape */
  border-top-left-radius: 50% 90px;
  border-top-right-radius: 50% 90px;

  font-family: 'Open Sans', sans-serif;
  line-height: 1.4;
  letter-spacing: 0.5px;

  box-sizing: border-box;
}
</style>

<noscript>
<style amp-boilerplate>
body{animation:none}
</style>
</noscript>

</head>

<body>

<amp-story 
  standalone
  title="${story[0].storytitle}"
  publisher="Mobile Masala"
>

${pages}

</amp-story>

</body>
</html>
    `);

  } catch (err) {
    console.error(err);
    res.send("Error loading story");
  }
});


app.post("/:lang/search", async (req, res) => {
  try {
    const lang = req.params.lang || "en";
    const name = (req.body?.name || req.query?.name || "").trim();
    const page = parseInt(req.body?.page || req.query?.page || 1);

    if (!name) {
      return res.json({ status: 0, message: "Search keyword required" });
    }

    const langMap = {
      en: "English",
      tl: "Telugu",
      hi: "Hindi"
    };

    const language = langMap[lang] || "English";

    const limit = 24;
    const offset = (page - 1) * limit;

    /* ================= SEARCH ================= */

    const searchResults = await runQuery(`
      SELECT 
        p.postid,
        p.posttitle,
        p.posttitle_new,
        p.imagepath,
        p.published_date,
        c.category_url,
        c.categoryname
      FROM post p
      LEFT JOIN category c ON p.categoryid = c.categoryid
      WHERE (
        LOWER(p.posttitle) LIKE LOWER(?) 
        OR LOWER(REPLACE(p.posttitle_new, '-', ' ')) LIKE LOWER(?)
        OR LOWER(p.hashtag) LIKE LOWER(?)
      )

      -- ✅ LANGUAGE FILTER (IMPORTANT)
      AND (
        LOWER(p.language) = LOWER(?) 
        OR p.language IS NULL 
        OR p.language = ''
      )

      -- ❌ REMOVE CELEBRITIES CATEGORY
      AND LOWER(c.category_url) NOT LIKE '%celeb%'

      AND p.status = 'Publish'

      ORDER BY p.published_date DESC
      LIMIT ? OFFSET ?
    `, [
      `%${name}%`,
      `%${name}%`,
      `%${name}%`,
      language,
      limit,
      offset
    ]);

    /* ================= COUNT ================= */

    const [countRows] = await runQuery(`
      SELECT COUNT(*) as total 
      FROM post p
      LEFT JOIN category c ON p.categoryid = c.categoryid
      WHERE (
        LOWER(p.posttitle) LIKE LOWER(?) 
        OR LOWER(REPLACE(p.posttitle_new, '-', ' ')) LIKE LOWER(?)
        OR LOWER(p.hashtag) LIKE LOWER(?)
      )

      AND (
        LOWER(p.language) = LOWER(?) 
        OR p.language IS NULL 
        OR p.language = ''
      )

      AND LOWER(c.category_url) NOT LIKE '%celeb%'

      AND p.status = 'Publish'
    `, [
      `%${name}%`,
      `%${name}%`,
      `%${name}%`,
      language
    ]);

    const total = countRows?.total || 0;
    const totalPages = Math.ceil(total / limit);

    /* ================= PAGINATION ================= */

    const paginationurls = [];

    if (page > 1) {
      paginationurls.push({ "<<": page - 1 });
    }

    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) {
      paginationurls.push({ [i]: i });
    }

    if (page < totalPages) {
      paginationurls.push({ ">>": page + 1 });
    }

    /* ================= RESPONSE ================= */

    res.json({
      status: 1,
      data: {
        metadata: { title: `Search: ${name}` },
        pagetitle: `Search Results for "${name}"`,

        categorydata: [
          searchResults.map(p => ({
            postid: p.postid,
            title: p.posttitle,
            articleurl: p.posttitle_new,
            image: p.imagepath,
            categoryurl: p.category_url,
            categorytitle: p.categoryname   // ✅ now language correct
          }))
        ],

        pagination: {
          paginationnumber: page,
          paginationurls
        }
      }
    });

  } catch (err) {
    console.error("❌ Search API Error:", err.message);
    res.status(500).json({ status: 0 });
  }
});
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});