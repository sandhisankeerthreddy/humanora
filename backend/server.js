"use strict";

/* =========================================================
   HUMANORA BACKEND
   AI rewriting + authentication + SQLite + history
   + permanent daily Free plan usage limits
========================================================= */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { InferenceClient } = require("@huggingface/inference");

dotenv.config();

/* =========================================================
   APP CONFIGURATION
========================================================= */

const app = express();

const PORT = Number(process.env.PORT) || 3000;

const MODEL = "openai/gpt-oss-120b:fastest";

const MAX_TEXT_LENGTH = 10000;

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "humanora-development-secret-change-before-production";

const JWT_EXPIRES_IN = "7d";

const MAX_HISTORY_RESULTS = 50;

/* =========================================================
   PLAN CONFIGURATION
========================================================= */

const PLAN_LIMITS = {
    free: {
        name: "Free",
        dailyLimit: 20
    },

    pro: {
        name: "Pro",
        dailyLimit: null
    }
};

/* =========================================================
   HUMANORA OPTIONS
========================================================= */

const VALID_MODES = [
    "humanize",
    "improve",
    "simplify",
    "shorten",
    "expand",
    "grammar"
];

const VALID_TONES = [
    "natural",
    "professional",
    "casual",
    "academic",
    "friendly"
];

const VALID_STRENGTHS = [
    "light",
    "medium",
    "strong"
];

const MODE_NAMES = {
    humanize: "Humanize",
    improve: "Improve Writing",
    simplify: "Simplify",
    shorten: "Shorten",
    expand: "Expand",
    grammar: "Fix Grammar"
};

/* =========================================================
   MODE INSTRUCTIONS
========================================================= */

const MODE_INSTRUCTIONS = {
    humanize: `
Rewrite the text so it reads naturally and conversationally.

Improve stiff, repetitive, mechanical, or awkward wording.

Preserve:
- the original meaning
- facts
- names
- numbers
- dates
- point of view

Do not invent information.

The objective is simply high-quality natural writing.
Do not claim or imply that the result can bypass or defeat AI detection.
`,

    improve: `
Improve the writing quality.

Focus on:
- clarity
- readability
- flow
- word choice
- sentence structure
- conciseness
- coherence

Preserve the original meaning and factual information.
`,

    simplify: `
Rewrite the text so it is easier to understand.

Use:
- clearer sentences
- simpler vocabulary
- direct explanations

Reduce unnecessary complexity while preserving important details.
`,

    shorten: `
Make the text more concise.

Remove:
- repetition
- filler
- unnecessary wording
- redundant explanations

Preserve the essential meaning and important information.
`,

    expand: `
Expand the text into a fuller and more developed version.

You may:
- improve transitions
- explain ideas already present
- add useful detail based on the supplied text
- improve structure

Do not fabricate:
- facts
- statistics
- quotes
- names
- events
- research
- citations
- claims not supported by the original text
`,

    grammar: `
Correct:
- grammar
- spelling
- punctuation
- capitalization
- sentence structure
- obvious wording problems

Make only the rewriting necessary to correct and polish the text.

Preserve the author's wording and meaning as much as possible.
`
};

/* =========================================================
   TONE INSTRUCTIONS
========================================================= */

const TONE_INSTRUCTIONS = {
    natural: `
Use a natural, balanced tone.
The writing should feel clear and comfortable without becoming overly casual.
`,

    professional: `
Use a polished professional tone suitable for workplace and business communication.
`,

    casual: `
Use a relaxed and conversational tone while remaining clear and readable.
`,

    academic: `
Use a clear academic tone with precise wording and logical structure.
Do not invent references, citations, research, or academic sources.
`,

    friendly: `
Use a warm, approachable, positive, and friendly tone.
`
};

/* =========================================================
   STRENGTH INSTRUCTIONS
========================================================= */

const STRENGTH_INSTRUCTIONS = {
    light: `
Make light edits.
Preserve most of the original wording and sentence structure.
`,

    medium: `
Make moderate edits.
Improve wording, flow, and structure while keeping the original voice recognizable.
`,

    strong: `
Make substantial improvements where useful.
You may restructure sentences and paragraphs while preserving the original meaning and factual information.
`
};

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(
    cors({
        origin: "*",

        methods: [
            "GET",
            "POST",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

app.use(
    express.json({
        limit: "1mb"
    })
);

/* =========================================================
   HUGGING FACE
========================================================= */

const HF_TOKEN = process.env.HF_TOKEN;

if (!HF_TOKEN) {
    console.error(
        "\nERROR: HF_TOKEN was not found in your .env file.\n"
    );

    process.exit(1);
}

const hf = new InferenceClient(HF_TOKEN);

/* =========================================================
   DATABASE
========================================================= */

const DATA_DIRECTORY = path.join(
    __dirname,
    "data"
);

if (!fs.existsSync(DATA_DIRECTORY)) {
    fs.mkdirSync(
        DATA_DIRECTORY,
        {
            recursive: true
        }
    );
}

const DATABASE_PATH = path.join(
    DATA_DIRECTORY,
    "humanora.db"
);

const db = new Database(DATABASE_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/* =========================================================
   DATABASE TABLES

   IMPORTANT:
   Existing Humanora users/history are preserved.
========================================================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        total_transformations INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transformations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_id TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        original_text TEXT NOT NULL,
        result_text TEXT NOT NULL,
        mode TEXT NOT NULL,
        tone TEXT NOT NULL,
        strength TEXT NOT NULL,
        original_score INTEGER,
        result_score INTEGER,
        created_at TEXT NOT NULL,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );

    /*
     * Daily usage is intentionally separate from history.
     *
     * This means deleting transformation history does NOT
     * restore the user's daily allowance.
     */
    CREATE TABLE IF NOT EXISTS daily_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        usage_date TEXT NOT NULL,
        transformations_used INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE,

        UNIQUE(user_id, usage_date)
    );

    CREATE INDEX IF NOT EXISTS idx_transformations_user_id
    ON transformations(user_id);

    CREATE INDEX IF NOT EXISTS idx_transformations_created_at
    ON transformations(created_at);

    CREATE INDEX IF NOT EXISTS idx_transformations_user_created
    ON transformations(user_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date
    ON daily_usage(user_id, usage_date);
`);

/* =========================================================
   MIGRATE EXISTING HISTORY INTO DAILY USAGE

   INSERT OR IGNORE means this only creates a usage row when
   one does not already exist for that user/date.

   Existing daily_usage values will not be overwritten when
   the server restarts.
========================================================= */

db.exec(`
    INSERT OR IGNORE INTO daily_usage (
        user_id,
        usage_date,
        transformations_used,
        created_at,
        updated_at
    )

    SELECT
        user_id,
        substr(created_at, 1, 10),
        COUNT(*),
        MIN(created_at),
        MAX(created_at)

    FROM transformations

    WHERE
        created_at IS NOT NULL
        AND length(created_at) >= 10

    GROUP BY
        user_id,
        substr(created_at, 1, 10);
`);

/* =========================================================
   DATABASE STATEMENTS
========================================================= */

const statements = {
    createUser: db.prepare(`
        INSERT INTO users (
            public_id,
            name,
            email,
            password_hash,
            plan,
            total_transformations,
            created_at,
            updated_at
        )

        VALUES (
            @publicId,
            @name,
            @email,
            @passwordHash,
            'free',
            0,
            @createdAt,
            @updatedAt
        )
    `),

    getUserByEmail: db.prepare(`
        SELECT *
        FROM users
        WHERE email = ?
        LIMIT 1
    `),

    getUserById: db.prepare(`
        SELECT *
        FROM users
        WHERE id = ?
        LIMIT 1
    `),

    incrementUserTransformations: db.prepare(`
        UPDATE users

        SET
            total_transformations =
                total_transformations + 1,

            updated_at = ?

        WHERE id = ?
    `),

    saveTransformation: db.prepare(`
        INSERT INTO transformations (
            public_id,
            user_id,
            original_text,
            result_text,
            mode,
            tone,
            strength,
            original_score,
            result_score,
            created_at
        )

        VALUES (
            @publicId,
            @userId,
            @originalText,
            @resultText,
            @mode,
            @tone,
            @strength,
            @originalScore,
            @resultScore,
            @createdAt
        )
    `),

    getUserHistory: db.prepare(`
        SELECT
            public_id,
            original_text,
            result_text,
            mode,
            tone,
            strength,
            original_score,
            result_score,
            created_at

        FROM transformations

        WHERE user_id = ?

        ORDER BY id DESC

        LIMIT ?
    `),

    getTransformationByPublicId: db.prepare(`
        SELECT *

        FROM transformations

        WHERE
            public_id = ?
            AND user_id = ?

        LIMIT 1
    `),

    deleteTransformation: db.prepare(`
        DELETE FROM transformations

        WHERE
            public_id = ?
            AND user_id = ?
    `),

    clearUserHistory: db.prepare(`
        DELETE FROM transformations
        WHERE user_id = ?
    `),

    getDailyUsage: db.prepare(`
        SELECT transformations_used

        FROM daily_usage

        WHERE
            user_id = ?
            AND usage_date = ?

        LIMIT 1
    `),

    incrementDailyUsage: db.prepare(`
        INSERT INTO daily_usage (
            user_id,
            usage_date,
            transformations_used,
            created_at,
            updated_at
        )

        VALUES (
            ?,
            ?,
            1,
            ?,
            ?
        )

        ON CONFLICT(user_id, usage_date)

        DO UPDATE SET
            transformations_used =
                transformations_used + 1,

            updated_at =
                excluded.updated_at
    `)
};

/* =========================================================
   GENERAL HELPERS
========================================================= */

function nowISO() {
    return new Date().toISOString();
}

function createPublicId(prefix) {
    return `${prefix}_${crypto.randomUUID()}`;
}

function cleanString(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function normalizeEmail(value) {
    return cleanString(value).toLowerCase();
}

function normalizeMode(value) {
    const mode =
        cleanString(value).toLowerCase();

    return VALID_MODES.includes(mode)
        ? mode
        : "humanize";
}

function normalizeTone(value) {
    const tone =
        cleanString(value).toLowerCase();

    return VALID_TONES.includes(tone)
        ? tone
        : "natural";
}

function normalizeStrength(value) {
    const strength =
        cleanString(value).toLowerCase();

    return VALID_STRENGTHS.includes(strength)
        ? strength
        : "medium";
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================================================
   DAILY USAGE HELPERS
========================================================= */

function getUTCDateKey(date = new Date()) {
    return date
        .toISOString()
        .slice(0, 10);
}

function getUTCUsageWindow(date = new Date()) {
    const dateKey =
        getUTCDateKey(date);

    const start =
        `${dateKey}T00:00:00.000Z`;

    const nextDate =
        new Date(
            `${dateKey}T00:00:00.000Z`
        );

    nextDate.setUTCDate(
        nextDate.getUTCDate() + 1
    );

    const end =
        nextDate.toISOString();

    return {
        dateKey,
        start,
        end,
        resetsAt: end
    };
}

function normalizePlan(plan) {
    const normalized =
        cleanString(plan).toLowerCase();

    if (PLAN_LIMITS[normalized]) {
        return normalized;
    }

    return "free";
}

function getUserUsage(user) {
    const plan =
        normalizePlan(user?.plan);

    const planConfig =
        PLAN_LIMITS[plan];

    const window =
        getUTCUsageWindow();

    const result =
        statements
            .getDailyUsage
            .get(
                user.id,
                window.dateKey
            );

    const used =
        Number(
            result?.transformations_used || 0
        );

    const limit =
        planConfig.dailyLimit;

    const unlimited =
        limit === null;

    const remaining =
        unlimited
            ? null
            : Math.max(
                0,
                limit - used
            );

    const limitReached =
        unlimited
            ? false
            : used >= limit;

    return {
        plan,

        planName:
            planConfig.name,

        usedToday:
            used,

        dailyLimit:
            limit,

        remainingToday:
            remaining,

        unlimited,

        limitReached,

        date:
            window.dateKey,

        timezone:
            "UTC",

        resetsAt:
            window.resetsAt
    };
}

function incrementUserDailyUsage(userId) {
    const window =
        getUTCUsageWindow();

    const timestamp =
        nowISO();

    statements
        .incrementDailyUsage
        .run(
            userId,
            window.dateKey,
            timestamp,
            timestamp
        );
}

/* =========================================================
   USER FORMATTER
========================================================= */

function sanitizeUser(user) {
    const usage =
        getUserUsage(user);

    return {
        id:
            user.public_id,

        name:
            user.name,

        email:
            user.email,

        plan:
            normalizePlan(
                user.plan
            ),

        planName:
            usage.planName,

        totalTransformations:
            Number(
                user.total_transformations || 0
            ),

        usage,

        createdAt:
            user.created_at
    };
}

/* =========================================================
   JWT
========================================================= */

function createAuthToken(user) {
    return jwt.sign(
        {
            userId:
                user.id,

            publicId:
                user.public_id,

            email:
                user.email
        },

        JWT_SECRET,

        {
            expiresIn:
                JWT_EXPIRES_IN
        }
    );
}

function getBearerToken(req) {
    const authorization =
        req.headers.authorization || "";

    if (
        !authorization.startsWith(
            "Bearer "
        )
    ) {
        return null;
    }

    return authorization
        .slice(7)
        .trim();
}

/* =========================================================
   OPTIONAL AUTHENTICATION
========================================================= */

function optionalAuth(req, res, next) {
    const token =
        getBearerToken(req);

    if (!token) {
        req.user = null;

        return next();
    }

    try {
        const payload =
            jwt.verify(
                token,
                JWT_SECRET
            );

        const user =
            statements
                .getUserById
                .get(
                    payload.userId
                );

        req.user =
            user || null;

        return next();

    } catch (error) {
        req.user = null;

        return next();
    }
}

/* =========================================================
   REQUIRED AUTHENTICATION
========================================================= */

function requireAuth(req, res, next) {
    const token =
        getBearerToken(req);

    if (!token) {
        return res
            .status(401)
            .json({
                success: false,

                error:
                    "Please sign in to continue."
            });
    }

    try {
        const payload =
            jwt.verify(
                token,
                JWT_SECRET
            );

        const user =
            statements
                .getUserById
                .get(
                    payload.userId
                );

        if (!user) {
            return res
                .status(401)
                .json({
                    success: false,

                    error:
                        "Your account could not be found."
                });
        }

        req.user =
            user;

        next();

    } catch (error) {
        return res
            .status(401)
            .json({
                success: false,

                error:
                    "Your session has expired. Please sign in again."
            });
    }
}

/* =========================================================
   AI PROMPT
========================================================= */

function buildSystemPrompt(
    mode,
    tone,
    strength
) {
    return `
You are Humanora, a high-quality writing transformation assistant.

TASK:

${MODE_INSTRUCTIONS[mode]}

TONE:

${TONE_INSTRUCTIONS[tone]}

EDIT STRENGTH:

${STRENGTH_INSTRUCTIONS[strength]}

STRICT RULES:

1. Preserve the user's intended meaning.

2. Preserve factual information, names, numbers, dates, and important details.

3. Never fabricate facts or unsupported information.

4. Do not explain what you changed.

5. Do not begin with phrases such as:
   "Here is the rewritten version"
   "Sure"
   "Of course"
   "Here's your text"

6. Return only the transformed text.

7. Preserve paragraph structure when appropriate.

8. Do not wrap the entire result in quotation marks.

9. Do not introduce Markdown headings unless headings are appropriate to the source text.

10. The objective is good writing quality.
    Never claim that the text will bypass,
    defeat, evade, or guarantee results against AI detection systems.
`.trim();
}

function buildUserPrompt(text) {
    return `
Transform the following text according to the instructions.

TEXT:

${text}
`.trim();
}

/* =========================================================
   AI RESPONSE EXTRACTION
========================================================= */

function extractGeneratedText(response) {
    const chatText =
        response
            ?.choices
            ?.[0]
            ?.message
            ?.content;

    if (
        typeof chatText === "string" &&
        chatText.trim()
    ) {
        return chatText.trim();
    }

    const generatedText =
        response?.generated_text;

    if (
        typeof generatedText === "string" &&
        generatedText.trim()
    ) {
        return generatedText.trim();
    }

    throw new Error(
        "The AI provider returned an empty response."
    );
}

/* =========================================================
   AI GENERATION
========================================================= */

async function generateRewrite({
    text,
    mode,
    tone,
    strength
}) {
    const response =
        await hf.chatCompletion({
            model:
                MODEL,

            messages: [
                {
                    role:
                        "system",

                    content:
                        buildSystemPrompt(
                            mode,
                            tone,
                            strength
                        )
                },

                {
                    role:
                        "user",

                    content:
                        buildUserPrompt(
                            text
                        )
                }
            ],

            temperature:
                mode === "grammar"
                    ? 0.25
                    : mode === "expand"
                        ? 0.7
                        : 0.6,

            max_tokens:
                mode === "expand"
                    ? 3500
                    : 2500
        });

    return extractGeneratedText(
        response
    );
}

/* =========================================================
   STYLE ANALYSIS

   This is a writing-style heuristic.
   It is NOT an AI detector.
========================================================= */

function analyzeTextStyle(text) {
    const value =
        cleanString(text);

    if (!value) {
        return {
            aiLikelihoodEstimate:
                0,

            analysisLabel:
                "No text",

            analysisExplanation:
                "Add text to receive a writing-style estimate.",

            metrics: {
                wordCount:
                    0,

                sentenceCount:
                    0,

                averageSentenceLength:
                    0,

                lexicalDiversity:
                    0
            }
        };
    }

    const words =
        value
            .toLowerCase()
            .match(
                /[a-z0-9']+/gi
            ) || [];

    const sentences =
        value
            .split(/[.!?]+/)
            .map(
                sentence =>
                    sentence.trim()
            )
            .filter(Boolean);

    const paragraphs =
        value
            .split(/\n\s*\n/)
            .map(
                paragraph =>
                    paragraph.trim()
            )
            .filter(Boolean);

    const wordCount =
        words.length;

    const sentenceCount =
        Math.max(
            sentences.length,
            1
        );

    const averageSentenceLength =
        wordCount /
        sentenceCount;

    const uniqueWords =
        new Set(words).size;

    const lexicalDiversity =
        wordCount
            ? uniqueWords /
                wordCount
            : 0;

    const transitionPhrases = [
        "however",
        "therefore",
        "furthermore",
        "moreover",
        "in addition",
        "consequently",
        "overall",
        "in conclusion",
        "additionally",
        "nevertheless"
    ];

    const lowerText =
        value.toLowerCase();

    let transitionCount =
        0;

    for (
        const phrase
        of transitionPhrases
    ) {
        if (
            lowerText.includes(
                phrase
            )
        ) {
            transitionCount +=
                1;
        }
    }

    let score =
        18;

    if (
        averageSentenceLength >=
        18
    ) {
        score += 15;
    }

    if (
        averageSentenceLength >=
        24
    ) {
        score += 10;
    }

    if (
        lexicalDiversity <
            0.42 &&
        wordCount >
            50
    ) {
        score += 12;
    }

    if (
        transitionCount >=
        2
    ) {
        score += 10;
    }

    if (
        transitionCount >=
        4
    ) {
        score += 8;
    }

    if (
        paragraphs.length <=
            1 &&
        wordCount >
            180
    ) {
        score += 8;
    }

    const contractionMatches =
        value.match(
            /\b(?:I'm|you're|we're|they're|don't|doesn't|can't|won't|it's|that's|I've|we've|I'd|you'd)\b/gi
        ) || [];

    if (
        contractionMatches.length >=
        2
    ) {
        score -= 8;
    }

    const sentenceLengths =
        sentences
            .map(
                sentence =>
                    sentence
                        .split(/\s+/)
                        .filter(Boolean)
                        .length
            )
            .filter(
                length =>
                    length > 0
            );

    if (
        sentenceLengths.length >=
        3
    ) {
        const maxLength =
            Math.max(
                ...sentenceLengths
            );

        const minLength =
            Math.min(
                ...sentenceLengths
            );

        if (
            maxLength -
                minLength >=
            12
        ) {
            score -= 7;
        }
    }

    score =
        Math.round(
            Math.max(
                5,

                Math.min(
                    95,
                    score
                )
            )
        );

    let label =
        "Low";

    let explanation =
        "The writing contains varied and relatively natural stylistic patterns.";

    if (
        score >=
        70
    ) {
        label =
            "High";

        explanation =
            "The writing shows several structured or repetitive stylistic patterns sometimes associated with highly polished generated text.";
    }

    else if (
        score >=
        40
    ) {
        label =
            "Moderate";

        explanation =
            "The writing contains a mixture of natural and highly structured stylistic patterns.";
    }

    return {
        aiLikelihoodEstimate:
            score,

        analysisLabel:
            label,

        analysisExplanation:
            explanation,

        metrics: {
            wordCount,

            sentenceCount:
                sentences.length,

            averageSentenceLength:
                Number(
                    averageSentenceLength
                        .toFixed(1)
                ),

            lexicalDiversity:
                Number(
                    lexicalDiversity
                        .toFixed(2)
                )
        }
    };
}

/* =========================================================
   HISTORY FORMATTER
========================================================= */

function formatTransformation(row) {
    return {
        id:
            row.public_id,

        originalText:
            row.original_text,

        humanizedText:
            row.result_text,

        mode:
            row.mode,

        modeName:
            MODE_NAMES[
                row.mode
            ] ||
            row.mode,

        tone:
            row.tone,

        strength:
            row.strength,

        originalAnalysis: {
            aiLikelihoodEstimate:
                Number(
                    row.original_score ||
                    0
                )
        },

        humanizedAnalysis: {
            aiLikelihoodEstimate:
                Number(
                    row.result_score ||
                    0
                )
        },

        createdAt:
            row.created_at
    };
}

/* =========================================================
   ROOT
========================================================= */

app.get(
    "/",

    (req, res) => {
        res.json({
            name:
                "Humanora",

            status:
                "online",

            model:
                MODEL,

            database:
                "SQLite",

            authentication:
                "JWT",

            freeDailyLimit:
                PLAN_LIMITS
                    .free
                    .dailyLimit,

            usageStorage:
                "daily_usage",

            modes:
                VALID_MODES
        });
    }
);

/* =========================================================
   HEALTH
========================================================= */

app.get(
    "/api/health",

    (req, res) => {
        res.json({
            success:
                true,

            status:
                "healthy",

            service:
                "Humanora API",

            model:
                MODEL,

            database:
                "connected",

            freeDailyLimit:
                PLAN_LIMITS
                    .free
                    .dailyLimit,

            usageStorage:
                "daily_usage",

            timestamp:
                nowISO()
        });
    }
);

/* =========================================================
   REGISTER
========================================================= */

app.post(
    "/api/auth/register",

    async (req, res) => {
        try {
            const name =
                cleanString(
                    req.body?.name
                );

            const email =
                normalizeEmail(
                    req.body?.email
                );

            const password =
                typeof req.body
                    ?.password ===
                    "string"
                    ? req.body.password
                    : "";

            if (
                name.length <
                2
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Please enter your name."
                    });
            }

            if (
                name.length >
                80
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Your name is too long."
                    });
            }

            if (
                !isValidEmail(
                    email
                )
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Please enter a valid email address."
                    });
            }

            if (
                password.length <
                8
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Your password must contain at least 8 characters."
                    });
            }

            if (
                password.length >
                128
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Your password is too long."
                    });
            }

            const existingUser =
                statements
                    .getUserByEmail
                    .get(
                        email
                    );

            if (
                existingUser
            ) {
                return res
                    .status(409)
                    .json({
                        success:
                            false,

                        error:
                            "An account with this email already exists."
                    });
            }

            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );

            const createdAt =
                nowISO();

            const publicId =
                createPublicId(
                    "usr"
                );

            const result =
                statements
                    .createUser
                    .run({
                        publicId,
                        name,
                        email,
                        passwordHash,
                        createdAt,

                        updatedAt:
                            createdAt
                    });

            const user =
                statements
                    .getUserById
                    .get(
                        result
                            .lastInsertRowid
                    );

            const token =
                createAuthToken(
                    user
                );

            return res
                .status(201)
                .json({
                    success:
                        true,

                    message:
                        "Your Humanora account has been created.",

                    token,

                    user:
                        sanitizeUser(
                            user
                        )
                });

        } catch (error) {
            console.error(
                "REGISTER ERROR:",
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Humanora could not create your account right now."
                });
        }
    }
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
    "/api/auth/login",

    async (req, res) => {
        try {
            const email =
                normalizeEmail(
                    req.body?.email
                );

            const password =
                typeof req.body
                    ?.password ===
                    "string"
                    ? req.body.password
                    : "";

            if (
                !email ||
                !password
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Enter your email and password."
                    });
            }

            const user =
                statements
                    .getUserByEmail
                    .get(
                        email
                    );

            if (!user) {
                return res
                    .status(401)
                    .json({
                        success:
                            false,

                        error:
                            "The email or password is incorrect."
                    });
            }

            const passwordMatches =
                await bcrypt.compare(
                    password,
                    user.password_hash
                );

            if (
                !passwordMatches
            ) {
                return res
                    .status(401)
                    .json({
                        success:
                            false,

                        error:
                            "The email or password is incorrect."
                    });
            }

            const token =
                createAuthToken(
                    user
                );

            return res.json({
                success:
                    true,

                message:
                    "Welcome back to Humanora.",

                token,

                user:
                    sanitizeUser(
                        user
                    )
            });

        } catch (error) {
            console.error(
                "LOGIN ERROR:",
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Humanora could not sign you in right now."
                });
        }
    }
);

/* =========================================================
   CURRENT USER
========================================================= */

app.get(
    "/api/me",

    requireAuth,

    (req, res) => {
        try {
            const freshUser =
                statements
                    .getUserById
                    .get(
                        req.user.id
                    );

            return res.json({
                success:
                    true,

                user:
                    sanitizeUser(
                        freshUser
                    )
            });

        } catch (error) {
            console.error(
                "CURRENT USER ERROR:",
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Humanora could not load your account."
                });
        }
    }
);

/* =========================================================
   USAGE ENDPOINT
========================================================= */

app.get(
    "/api/usage",

    requireAuth,

    (req, res) => {
        try {
            const usage =
                getUserUsage(
                    req.user
                );

            return res.json({
                success:
                    true,

                usage
            });

        } catch (error) {
            console.error(
                "USAGE ERROR:",
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Humanora could not load your usage."
                });
        }
    }
);

/* =========================================================
   USER HISTORY
========================================================= */

app.get(
    "/api/history",

    requireAuth,

    (req, res) => {
        try {
            const rows =
                statements
                    .getUserHistory
                    .all(
                        req.user.id,
                        MAX_HISTORY_RESULTS
                    );

            return res.json({
                success:
                    true,

                count:
                    rows.length,

                history:
                    rows.map(
                        formatTransformation
                    )
            });

        } catch (error) {
            console.error(
                "HISTORY ERROR:",
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Humanora could not load your history."
                });
        }
    }
);

/* =========================================================
   DELETE ONE HISTORY ITEM
========================================================= */

app.delete(
    "/api/history/:id",

    requireAuth,

    (req, res) => {
        try {
            const transformationId =
                cleanString(
                    req.params.id
                );

            const transformation =
                statements
                    .getTransformationByPublicId
                    .get(
                        transformationId,
                        req.user.id
                    );

            if (
                !transformation
            ) {
                return res
                    .status(404)
                    .json({
                        success:
                            false,

                        error:
                            "Transformation not found."
                    });
            }

            statements
                .deleteTransformation
                .run(
                    transformationId,
                    req.user.id
                );

            /*
             * IMPORTANT:
             * We deliberately do NOT modify daily_usage here.
             *
             * Deleting history must not restore free credits.
             */

            return res.json({
                success:
                    true,

                message:
                    "Transformation deleted.",

                usage:
                    getUserUsage(
                        req.user
                    )
            });

        } catch (error) {
            console.error(
                "DELETE HISTORY ERROR:",
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Humanora could not delete this transformation."
                });
        }
    }
);

/* =========================================================
   CLEAR HISTORY
========================================================= */

app.delete(
    "/api/history",

    requireAuth,

    (req, res) => {
        try {
            statements
                .clearUserHistory
                .run(
                    req.user.id
                );

            /*
             * Again, daily_usage is NOT deleted.
             */

            return res.json({
                success:
                    true,

                message:
                    "Your transformation history has been cleared.",

                usage:
                    getUserUsage(
                        req.user
                    )
            });

        } catch (error) {
            console.error(
                "CLEAR HISTORY ERROR:",
                error
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Humanora could not clear your history."
                });
        }
    }
);

/* =========================================================
   HUMANORA TRANSFORMATION
========================================================= */

app.post(
    "/api/humanize",

    optionalAuth,

    async (req, res) => {
        try {
            const text =
                cleanString(
                    req.body?.text
                );

            if (!text) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Please enter some text first."
                    });
            }

            if (
                text.length >
                MAX_TEXT_LENGTH
            ) {
                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            `Text cannot exceed ${MAX_TEXT_LENGTH.toLocaleString()} characters.`
                    });
            }

            const mode =
                normalizeMode(
                    req.body?.mode
                );

            const tone =
                normalizeTone(
                    req.body?.tone
                );

            const strength =
                normalizeStrength(
                    req.body?.strength
                );

            /* =============================================
               CHECK DAILY LIMIT BEFORE CALLING AI
            ============================================= */

            let usageBefore =
                null;

            if (
                req.user
            ) {
                usageBefore =
                    getUserUsage(
                        req.user
                    );

                if (
                    usageBefore
                        .limitReached
                ) {
                    return res
                        .status(429)
                        .json({
                            success:
                                false,

                            code:
                                "DAILY_LIMIT_REACHED",

                            error:
                                `You have reached your ${usageBefore.dailyLimit} transformations for today.`,

                            message:
                                "Your Free plan daily limit has been reached. Your allowance will reset automatically tomorrow.",

                            usage:
                                usageBefore
                        });
                }
            }

            /* =============================================
               ANALYZE ORIGINAL
            ============================================= */

            const originalAnalysis =
                analyzeTextStyle(
                    text
                );

            /* =============================================
               GENERATE RESULT
            ============================================= */

            const humanizedText =
                await generateRewrite({
                    text,
                    mode,
                    tone,
                    strength
                });

            /* =============================================
               ANALYZE RESULT
            ============================================= */

            const humanizedAnalysis =
                analyzeTextStyle(
                    humanizedText
                );

            /* =============================================
               SAVE + COUNT SIGNED-IN TRANSFORMATION
            ============================================= */

            let savedTransformation =
                null;

            let usageAfter =
                usageBefore;

            if (
                req.user
            ) {
                const createdAt =
                    nowISO();

                const publicId =
                    createPublicId(
                        "trn"
                    );

                /*
                 * Count the successful AI request independently
                 * from transformation history.
                 *
                 * This is the key fix.
                 */
                try {
                    incrementUserDailyUsage(
                        req.user.id
                    );

                    usageAfter =
                        getUserUsage(
                            req.user
                        );

                } catch (
                    usageError
                ) {
                    console.error(
                        "DAILY USAGE SAVE ERROR:",
                        usageError
                    );
                }

                /*
                 * History is stored separately.
                 *
                 * If history saving fails, we still return the
                 * successful AI result and the daily request has
                 * still been counted.
                 */
                try {
                    statements
                        .saveTransformation
                        .run({
                            publicId,

                            userId:
                                req.user.id,

                            originalText:
                                text,

                            resultText:
                                humanizedText,

                            mode,
                            tone,
                            strength,

                            originalScore:
                                originalAnalysis
                                    .aiLikelihoodEstimate,

                            resultScore:
                                humanizedAnalysis
                                    .aiLikelihoodEstimate,

                            createdAt
                        });

                    savedTransformation = {
                        id:
                            publicId,

                        createdAt
                    };

                } catch (
                    historyError
                ) {
                    console.error(
                        "TRANSFORMATION HISTORY SAVE ERROR:",
                        historyError
                    );
                }

                /*
                 * Lifetime count is also independent from
                 * deletable history.
                 */
                try {
                    statements
                        .incrementUserTransformations
                        .run(
                            createdAt,
                            req.user.id
                        );

                } catch (
                    totalError
                ) {
                    console.error(
                        "TOTAL TRANSFORMATIONS UPDATE ERROR:",
                        totalError
                    );
                }
            }

            /* =============================================
               RESPONSE
            ============================================= */

            return res.json({
                success:
                    true,

                originalText:
                    text,

                humanizedText,

                mode,

                modeName:
                    MODE_NAMES[
                        mode
                    ],

                tone,

                strength,

                model:
                    MODEL,

                authenticated:
                    Boolean(
                        req.user
                    ),

                savedTransformation,

                usage:
                    usageAfter,

                originalAnalysis,

                humanizedAnalysis,

                /*
                 * Backward-compatible fields
                 */
                aiLikelihoodEstimate:
                    humanizedAnalysis
                        .aiLikelihoodEstimate,

                analysisLabel:
                    humanizedAnalysis
                        .analysisLabel,

                analysisExplanation:
                    humanizedAnalysis
                        .analysisExplanation
            });

        } catch (error) {
            console.error(
                "HUMANIZE ERROR:",
                error
            );

            const status =
                error?.status ||
                error?.statusCode;

            if (
                status === 401 ||
                status === 403
            ) {
                return res
                    .status(502)
                    .json({
                        success:
                            false,

                        error:
                            "The AI service could not authenticate. Please check the server configuration."
                    });
            }

            if (
                status === 429
            ) {
                return res
                    .status(429)
                    .json({
                        success:
                            false,

                        code:
                            "AI_PROVIDER_BUSY",

                        error:
                            "Humanora is receiving a lot of requests right now. Please try again shortly."
                    });
            }

            return res
                .status(500)
                .json({
                    success:
                        false,

                    error:
                        "Humanora could not process this text right now. Please try again."
                });
        }
    }
);

/* =========================================================
   404
========================================================= */

app.use(
    (req, res) => {
        res
            .status(404)
            .json({
                success:
                    false,

                error:
                    "Humanora API route not found."
            });
    }
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "SERVER ERROR:",
            error
        );

        if (
            res.headersSent
        ) {
            return next(
                error
            );
        }

        res
            .status(500)
            .json({
                success:
                    false,

                error:
                    "An unexpected Humanora server error occurred."
            });
    }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
    PORT,

    () => {
        console.log(`
========================================
         HUMANORA BACKEND
========================================

Server: http://localhost:${PORT}

Model:  ${MODEL}

Database: ${DATABASE_PATH}

Auth:   JWT

Free Plan: ${PLAN_LIMITS.free.dailyLimit} transformations/day

Usage Storage: daily_usage

Usage Reset: 00:00 UTC

Modes:  ${VALID_MODES.join(", ")}

========================================
        `);
    }
);