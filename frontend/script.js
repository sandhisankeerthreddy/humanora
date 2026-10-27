/* =========================================================
   HUMANORA FRONTEND
   Rewrite Workspace + Authentication + Account History
   + Daily Free Plan Usage
========================================================= */

"use strict";


/* =========================================================
   CONFIG
========================================================= */

const API_BASE_URL = "http://localhost:3001";

const LOCAL_HISTORY_KEY = "humanora_history";
const AUTH_TOKEN_KEY = "humanora_auth_token";

const MAX_LOCAL_HISTORY = 10;
const READING_SPEED = 220;
const MAX_TEXT_LENGTH = 10000;


/* =========================================================
   STATE
========================================================= */

let selectedMode = "humanize";
let selectedStrength = "medium";

let currentOriginalText = "";
let currentResultText = "";

let resultVersions = [];
let resultVersionIndex = -1;

let currentUser = null;
let authToken =
    localStorage.getItem(AUTH_TOKEN_KEY) || null;

let toastTimer = null;


/* =========================================================
   MODE DATA
========================================================= */

const modeData = {
    humanize: {
        label: "Humanize",
        button: "Humanize Text",
        outputTitle: "Humanized text",
        description:
            "Rewrites your text to sound smoother, more natural and less mechanical while preserving its meaning."
    },

    improve: {
        label: "Improve",
        button: "Improve Text",
        outputTitle: "Improved text",
        description:
            "Improves clarity, sentence flow, wording and readability while preserving your message."
    },

    simplify: {
        label: "Simplify",
        button: "Simplify Text",
        outputTitle: "Simplified text",
        description:
            "Makes complicated or dense writing easier to understand without removing important meaning."
    },

    shorten: {
        label: "Shorten",
        button: "Shorten Text",
        outputTitle: "Shortened text",
        description:
            "Makes your writing more concise while keeping the important information and original meaning."
    },

    expand: {
        label: "Expand",
        button: "Expand Text",
        outputTitle: "Expanded text",
        description:
            "Adds useful detail, explanation and context while staying focused on your original message."
    },

    grammar: {
        label: "Grammar",
        button: "Fix Grammar",
        outputTitle: "Corrected text",
        description:
            "Corrects grammar, spelling and punctuation while keeping your wording and meaning as intact as possible."
    }
};


/* =========================================================
   DOM HELPER
========================================================= */

const $ = (id) =>
    document.getElementById(id);


/* =========================================================
   ORIGINAL HUMANORA ELEMENTS
========================================================= */

const elements = {
    mainNav: $("mainNav"),
    mobileMenuBtn: $("mobileMenuBtn"),

    selectedModeLabel: $("selectedModeLabel"),
    modeDescription: $("modeDescription"),

    inputText: $("inputText"),
    clearInput: $("clearInput"),
    trySampleText: $("trySampleText"),

    inputWordCount: $("inputWordCount"),
    inputSentenceCount: $("inputSentenceCount"),
    inputReadingTime: $("inputReadingTime"),
    inputCharCount: $("inputCharCount"),

    tone: $("tone"),

    humanizeBtn: $("humanizeBtn"),
    actionMessage: $("actionMessage"),

    outputPanelTitle: $("outputPanelTitle"),
    outputPanelDescription: $("outputPanelDescription"),

    outputText: $("outputText"),

    outputWordCount: $("outputWordCount"),
    outputSentenceCount: $("outputSentenceCount"),
    outputReadingTime: $("outputReadingTime"),
    outputCharCount: $("outputCharCount"),

    copyOutput: $("copyOutput"),
    downloadOutput: $("downloadOutput"),

    resultTools: $("resultTools"),

    regenerateBtn: $("regenerateBtn"),
    undoResultBtn: $("undoResultBtn"),
    redoResultBtn: $("redoResultBtn"),
    compareBtn: $("compareBtn"),

    loadingCard: $("loadingCard"),

    /* =====================================================
       WRITING-STYLE ANALYSIS
       Supports both old + current Humanora HTML IDs
    ===================================================== */

    analysis:
        $("analysis") ||
        $("analysisCard"),

    originalHumanLabel:
        $("originalHumanLabel") ||
        $("originalHumanScoreLabel"),

    originalHumanPercentage:
        $("originalHumanPercentage") ||
        $("originalHumanScore"),

    originalAiPercentage:
        $("originalAiPercentage") ||
        $("originalAiScoreLabel"),

    originalHumanFill:
        $("originalHumanFill") ||
        $("originalHumanBar"),

    originalAiFill:
        $("originalAiFill") ||
        $("originalAiBar"),

    originalExplanation:
        $("originalExplanation") ||
        $("analysisExplanation"),

    resultHumanLabel:
        $("resultHumanLabel") ||
        $("resultHumanScoreLabel"),

    resultHumanPercentage:
        $("resultHumanPercentage") ||
        $("resultHumanScore"),

    resultAiPercentage:
        $("resultAiPercentage") ||
        $("resultAiScoreLabel"),

    resultHumanFill:
        $("resultHumanFill") ||
        $("resultHumanBar"),

    resultAiFill:
        $("resultAiFill") ||
        $("resultAiBar"),

    resultExplanation:
        $("resultExplanation") ||
        $("analysisExplanation"),

    scoreChange:
        $("scoreChange") ||
        $("humanScoreChange"),

    scoreChangeTitle:
        $("scoreChangeTitle"),

    scoreChangeText:
        $("scoreChangeText"),

    /* =====================================================
       HISTORY
    ===================================================== */

    historyDescription:
        $("historyDescription"),

    historyAccountBanner:
        $("historyAccountBanner"),

    historySignUpBtn:
        $("historySignUpBtn"),

    historyEmpty:
        $("historyEmpty"),

    historyGrid:
        $("historyGrid"),

    clearHistoryBtn:
        $("clearHistoryBtn"),

    /* =====================================================
       AUTH / ACCOUNT
    ===================================================== */

    guestActions:
        $("guestActions"),

    headerLoginBtn:
        $("headerLoginBtn"),

    headerRegisterBtn:
        $("headerRegisterBtn"),

    heroAccountBtn:
        $("heroAccountBtn"),

    finalAccountBtn:
        $("finalAccountBtn"),

    accountMenuWrapper:
        $("accountMenuWrapper"),

    accountTrigger:
        $("accountTrigger"),

    accountDropdown:
        $("accountDropdown"),

    accountAvatar:
        $("accountAvatar"),

    accountTriggerName:
        $("accountTriggerName"),

    accountTriggerPlan:
        $("accountTriggerPlan"),

    accountDropdownAvatar:
        $("accountDropdownAvatar"),

    accountDropdownName:
        $("accountDropdownName"),

    accountDropdownEmail:
        $("accountDropdownEmail"),

    accountTransformations:
        $("accountTransformations"),

    accountPlan:
        $("accountPlan"),

    accountHistoryBtn:
        $("accountHistoryBtn"),

    logoutBtn:
        $("logoutBtn"),

    saveStatusText:
        $("saveStatusText"),

    /* =====================================================
       AUTH MODAL
    ===================================================== */

    authModal:
        $("authModal"),

    authBackdrop:
        $("authBackdrop"),

    closeAuthBtn:
        $("closeAuthBtn"),

    loginTab:
        $("loginTab"),

    registerTab:
        $("registerTab"),

    loginView:
        $("loginView"),

    registerView:
        $("registerView"),

    loginForm:
        $("loginForm"),

    loginEmail:
        $("loginEmail"),

    loginPassword:
        $("loginPassword"),

    loginMessage:
        $("loginMessage"),

    loginSubmitBtn:
        $("loginSubmitBtn"),

    registerForm:
        $("registerForm"),

    registerName:
        $("registerName"),

    registerEmail:
        $("registerEmail"),

    registerPassword:
        $("registerPassword"),

    registerMessage:
        $("registerMessage"),

    registerSubmitBtn:
        $("registerSubmitBtn"),

    switchToRegister:
        $("switchToRegister"),

    switchToLogin:
        $("switchToLogin"),

    /* =====================================================
       COMPARE MODAL
    ===================================================== */

    compareModal:
        $("compareModal"),

    compareModalBackdrop:
        $("compareModalBackdrop"),

    closeCompareBtn:
        $("closeCompareBtn"),

    compareMode:
        $("compareMode"),

    compareTone:
        $("compareTone"),

    compareStrength:
        $("compareStrength"),

    compareOriginalStats:
        $("compareOriginalStats"),

    compareOriginalText:
        $("compareOriginalText"),

    compareResultStats:
        $("compareResultStats"),

    compareResultText:
        $("compareResultText"),

    compareCopyBtn:
        $("compareCopyBtn"),

    compareDoneBtn:
        $("compareDoneBtn"),

    /* =====================================================
       TOAST
    ===================================================== */

    siteToast:
        $("siteToast"),

    siteToastIcon:
        $("siteToastIcon"),

    siteToastTitle:
        $("siteToastTitle"),

    siteToastMessage:
        $("siteToastMessage"),

    /* =====================================================
       DAILY USAGE UI
    ===================================================== */

    accountUsage:
        $("accountUsage"),

    accountUsageLabel:
        $("accountUsageLabel"),

    accountUsageCount:
        $("accountUsageCount"),

    accountUsageTrack:
        $("accountUsageTrack"),

    accountUsageBar:
        $("accountUsageBar"),

    accountUsageRemaining:
        $("accountUsageRemaining"),

    accountUsageReset:
        $("accountUsageReset"),

    workspaceUsage:
        $("workspaceUsage"),

    workspaceUsagePlan:
        $("workspaceUsagePlan"),

    workspaceUsageCount:
        $("workspaceUsageCount"),

    workspaceUsageTrack:
        $("workspaceUsageTrack"),

    workspaceUsageBar:
        $("workspaceUsageBar"),

    workspaceUsageRemaining:
        $("workspaceUsageRemaining"),

    workspaceUsageReset:
        $("workspaceUsageReset")
};

/* =========================================================
   TEXT UTILITIES
========================================================= */

function cleanText(text) {
    return String(text || "").trim();
}


function countWords(text) {
    const cleaned =
        cleanText(text);

    if (!cleaned) {
        return 0;
    }

    return cleaned
        .split(/\s+/)
        .filter(Boolean)
        .length;
}


function countSentences(text) {
    const cleaned =
        cleanText(text);

    if (!cleaned) {
        return 0;
    }

    const matches =
        cleaned.match(
            /[^.!?]+[.!?]+|[^.!?]+$/g
        );

    return matches
        ? matches.length
        : 0;
}


function readingTime(text) {
    const words =
        countWords(text);

    if (!words) {
        return "0 min";
    }

    const minutes =
        Math.max(
            1,
            Math.ceil(
                words / READING_SPEED
            )
        );

    return `${minutes} min`;
}


function getTextStats(text) {
    return {
        words:
            countWords(text),

        sentences:
            countSentences(text),

        reading:
            readingTime(text),

        chars:
            String(text || "").length
    };
}


function formatStatsLine(text) {
    const stats =
        getTextStats(text);

    return `${stats.words} words • ${stats.sentences} sentences • ${stats.reading} read`;
}


function capitalize(value) {
    const cleaned =
        cleanText(value);

    if (!cleaned) {
        return "";
    }

    return (
        cleaned.charAt(0).toUpperCase() +
        cleaned.slice(1)
    );
}


function getInitial(name) {
    const cleaned =
        cleanText(name);

    return cleaned
        ? cleaned.charAt(0).toUpperCase()
        : "H";
}


function truncateText(
    text,
    maxLength
) {
    const cleaned =
        cleanText(text);

    if (
        cleaned.length <=
        maxLength
    ) {
        return cleaned;
    }

    return (
        cleaned
            .slice(
                0,
                maxLength
            )
            .trim() +
        "…"
    );
}


function escapeHTML(value) {
    return String(value || "")
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================================
   INPUT / OUTPUT STATS
========================================================= */

function updateInputStats() {
    if (!elements.inputText) {
        return;
    }

    const stats =
        getTextStats(
            elements.inputText.value
        );

    if (
        elements.inputWordCount
    ) {
        elements.inputWordCount.textContent =
            stats.words;
    }

    if (
        elements.inputSentenceCount
    ) {
        elements.inputSentenceCount.textContent =
            stats.sentences;
    }

    if (
        elements.inputReadingTime
    ) {
        elements.inputReadingTime.textContent =
            stats.reading;
    }

    if (
        elements.inputCharCount
    ) {
        elements.inputCharCount.textContent =
            stats.chars;
    }
}


function updateOutputStats(
    text = ""
) {
    const stats =
        getTextStats(text);

    if (
        elements.outputWordCount
    ) {
        elements.outputWordCount.textContent =
            stats.words;
    }

    if (
        elements.outputSentenceCount
    ) {
        elements.outputSentenceCount.textContent =
            stats.sentences;
    }

    if (
        elements.outputReadingTime
    ) {
        elements.outputReadingTime.textContent =
            stats.reading;
    }

    if (
        elements.outputCharCount
    ) {
        elements.outputCharCount.textContent =
            stats.chars;
    }
}


/* =========================================================
   GENERAL UI
========================================================= */

function setActionMessage(
    message = "",
    type = ""
) {
    if (
        !elements.actionMessage
    ) {
        return;
    }

    elements.actionMessage.textContent =
        message;

    elements.actionMessage.className =
        "action-message";

    if (type) {
        elements.actionMessage.classList.add(
            type
        );
    }
}


function showToast(
    title,
    message,
    icon = "✓"
) {
    if (
        !elements.siteToast
    ) {
        return;
    }

    clearTimeout(
        toastTimer
    );

    if (
        elements.siteToastTitle
    ) {
        elements.siteToastTitle.textContent =
            title;
    }

    if (
        elements.siteToastMessage
    ) {
        elements.siteToastMessage.textContent =
            message;
    }

    if (
        elements.siteToastIcon
    ) {
        elements.siteToastIcon.textContent =
            icon;
    }

    elements.siteToast.classList.remove(
        "hidden"
    );

    toastTimer =
        setTimeout(
            () => {
                elements.siteToast.classList.add(
                    "hidden"
                );
            },
            3500
        );
}


function scrollToSection(id) {
    const target =
        document.getElementById(
            id
        );

    if (!target) {
        return;
    }

    target.scrollIntoView({
        behavior:
            "smooth",

        block:
            "start"
    });
}


/* =========================================================
   MODE SELECTION
========================================================= */

function selectMode(mode) {
    if (
        !modeData[mode]
    ) {
        return;
    }

    selectedMode =
        mode;

    document
        .querySelectorAll(
            ".rewrite-mode"
        )
        .forEach(
            (button) => {
                button.classList.toggle(
                    "active",
                    button.dataset.mode ===
                        mode
                );
            }
        );

    const data =
        modeData[mode];

    if (
        elements.selectedModeLabel
    ) {
        elements.selectedModeLabel.textContent =
            data.label;
    }

    if (
        elements.modeDescription
    ) {
        elements.modeDescription.textContent =
            data.description;
    }

    if (
        elements.outputPanelTitle
    ) {
        elements.outputPanelTitle.textContent =
            data.outputTitle;
    }

    const buttonText =
        elements.humanizeBtn
            ?.querySelector(
                ".btn-text"
            );

    if (
        buttonText &&
        !elements.humanizeBtn
            ?.classList.contains(
                "daily-limit-reached"
            )
    ) {
        buttonText.textContent =
            data.button;
    }
}


function selectStrength(
    strength
) {
    if (
        ![
            "light",
            "medium",
            "strong"
        ].includes(strength)
    ) {
        return;
    }

    selectedStrength =
        strength;

    document
        .querySelectorAll(
            ".strength-btn"
        )
        .forEach(
            (button) => {
                button.classList.toggle(
                    "active",
                    button.dataset.strength ===
                        strength
                );
            }
        );
}


/* =========================================================
   OUTPUT
========================================================= */

function setOutput(text) {
    currentResultText =
        cleanText(text);

    if (
        !elements.outputText
    ) {
        return;
    }

    if (
        !currentResultText
    ) {
        elements.outputText.classList.add(
            "empty-output"
        );

        elements.outputText.innerHTML = `
            <div class="empty-result-state">
                <span>✦</span>

                <strong>
                    Your result will appear here
                </strong>

                <p>
                    Enter some text and choose a mode
                    to get started.
                </p>
            </div>
        `;

        updateOutputStats("");

        elements.resultTools
            ?.classList.add(
                "hidden"
            );

        return;
    }

    elements.outputText.classList.remove(
        "empty-output"
    );

    elements.outputText.textContent =
        currentResultText;

    updateOutputStats(
        currentResultText
    );

    elements.resultTools
        ?.classList.remove(
            "hidden"
        );

    updateVersionButtons();
}


/* =========================================================
   RESULT VERSION HISTORY
========================================================= */

function resetResultVersions() {
    resultVersions = [];
    resultVersionIndex = -1;

    updateVersionButtons();
}


function addResultVersion(text) {
    const result =
        cleanText(text);

    if (!result) {
        return;
    }

    if (
        resultVersionIndex >= 0 &&
        resultVersions[
            resultVersionIndex
        ] === result
    ) {
        return;
    }

    if (
        resultVersionIndex <
        resultVersions.length - 1
    ) {
        resultVersions =
            resultVersions.slice(
                0,
                resultVersionIndex + 1
            );
    }

    resultVersions.push(
        result
    );

    resultVersionIndex =
        resultVersions.length - 1;

    updateVersionButtons();
}


function updateVersionButtons() {
    if (
        elements.undoResultBtn
    ) {
        elements.undoResultBtn.disabled =
            resultVersionIndex <= 0;
    }

    if (
        elements.redoResultBtn
    ) {
        elements.redoResultBtn.disabled =
            resultVersionIndex < 0 ||
            resultVersionIndex >=
                resultVersions.length - 1;
    }
}


function undoResult() {
    if (
        resultVersionIndex <= 0
    ) {
        return;
    }

    resultVersionIndex -= 1;

    setOutput(
        resultVersions[
            resultVersionIndex
        ]
    );
}


function redoResult() {
    if (
        resultVersionIndex < 0 ||
        resultVersionIndex >=
            resultVersions.length - 1
    ) {
        return;
    }

    resultVersionIndex += 1;

    setOutput(
        resultVersions[
            resultVersionIndex
        ]
    );
}


/* =========================================================
   AUTH HELPERS
========================================================= */

function getAuthHeaders() {
    if (!authToken) {
        return {};
    }

    return {
        Authorization:
            `Bearer ${authToken}`
    };
}


function saveAuthToken(token) {
    authToken =
        token || null;

    if (authToken) {
        localStorage.setItem(
            AUTH_TOKEN_KEY,
            authToken
        );
    } else {
        localStorage.removeItem(
            AUTH_TOKEN_KEY
        );
    }
}


function removeAuthToken() {
    authToken = null;

    localStorage.removeItem(
        AUTH_TOKEN_KEY
    );
}

/* =========================================================
   AUTH MODAL
========================================================= */

function openAuthModal(view = "login") {
    if (!elements.authModal) {
        return;
    }

    elements.authModal.classList.remove(
        "hidden"
    );

    elements.authModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    setAuthView(view);

    setTimeout(() => {
        if (
            view === "register"
        ) {
            elements.registerName
                ?.focus();
        } else {
            elements.loginEmail
                ?.focus();
        }
    }, 50);
}


function closeAuthModal() {
    if (!elements.authModal) {
        return;
    }

    elements.authModal.classList.add(
        "hidden"
    );

    elements.authModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

    clearAuthMessages();
}


function setAuthView(view) {
    const isRegister =
        view === "register";

    elements.loginTab
        ?.classList.toggle(
            "active",
            !isRegister
        );

    elements.registerTab
        ?.classList.toggle(
            "active",
            isRegister
        );

    elements.loginView
        ?.classList.toggle(
            "hidden",
            isRegister
        );

    elements.registerView
        ?.classList.toggle(
            "hidden",
            !isRegister
        );

    clearAuthMessages();
}


function clearAuthMessages() {
    if (
        elements.loginMessage
    ) {
        elements.loginMessage.textContent =
            "";

        elements.loginMessage.className =
            "auth-message";
    }

    if (
        elements.registerMessage
    ) {
        elements.registerMessage.textContent =
            "";

        elements.registerMessage.className =
            "auth-message";
    }
}


function setAuthMessage(
    element,
    message,
    type = "error"
) {
    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        `auth-message ${type}`;
}


function setAuthButtonLoading(
    button,
    loading,
    defaultText
) {
    if (!button) {
        return;
    }

    button.disabled =
        loading;

    const firstSpan =
        button.querySelector(
            "span"
        );

    if (firstSpan) {
        firstSpan.textContent =
            loading
                ? "Please wait..."
                : defaultText;

        return;
    }

    button.textContent =
        loading
            ? "Please wait..."
            : defaultText;
}


/* =========================================================
   DAILY USAGE HELPERS
========================================================= */

function getCurrentUsage() {
    if (
        !currentUser
    ) {
        return null;
    }

    return (
        currentUser.usage ||
        currentUser.dailyUsage ||
        null
    );
}


function formatUsageReset() {
    return "Resets daily at 00:00 UTC";
}


function getUsagePercentage(
    usage
) {
    if (
        !usage ||
        usage.unlimited ||
        usage.dailyLimit === null
    ) {
        return 0;
    }

    const used =
        Number(
            usage.usedToday || 0
        );

    const limit =
        Number(
            usage.dailyLimit || 0
        );

    if (!limit) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                (used / limit) * 100
            )
        )
    );
}


function setUsageProgressBar(
    element,
    percentage
) {
    if (!element) {
        return;
    }

    element.style.width =
        `${percentage}%`;
}


function clearUsageClasses(
    element
) {
    if (!element) {
        return;
    }

    element.classList.remove(
        "usage-warning",
        "usage-limit-reached",
        "usage-unlimited"
    );
}


function hasReachedDailyLimit() {
    const usage =
        getCurrentUsage();

    if (!usage) {
        return false;
    }

    if (
        usage.unlimited ||
        usage.dailyLimit === null
    ) {
        return false;
    }

    return Boolean(
        usage.limitReached ||
        Number(
            usage.usedToday || 0
        ) >=
        Number(
            usage.dailyLimit || 20
        )
    );
}


function updateTransformButtonForUsage() {
    if (
        !elements.humanizeBtn
    ) {
        return;
    }

    const buttonText =
        elements.humanizeBtn
            .querySelector(
                ".btn-text"
            );

    if (
        currentUser &&
        hasReachedDailyLimit()
    ) {
        elements.humanizeBtn.disabled =
            true;

        elements.humanizeBtn.classList.add(
            "daily-limit-reached"
        );

        if (buttonText) {
            buttonText.textContent =
                "Daily Limit Reached";
        }

        return;
    }

    elements.humanizeBtn.disabled =
        false;

    elements.humanizeBtn.classList.remove(
        "daily-limit-reached"
    );

    if (buttonText) {
        buttonText.textContent =
            modeData[
                selectedMode
            ]?.button ||
            "Transform Text";
    }
}


function renderDailyUsage(
    usage = null
) {
    const loggedIn =
        Boolean(
            currentUser &&
            authToken
        );

    /*
     * Guests do not have
     * account quota UI.
     */
    elements.accountUsage
        ?.classList.toggle(
            "hidden",
            !loggedIn
        );

    elements.workspaceUsage
        ?.classList.toggle(
            "hidden",
            !loggedIn
        );

    if (!loggedIn) {
        updateTransformButtonForUsage();
        return;
    }

    const currentUsage =
        usage ||
        getCurrentUsage();

    if (!currentUsage) {
        updateTransformButtonForUsage();
        return;
    }

    currentUser.usage =
        currentUsage;

    const plan =
        currentUsage.plan ||
        currentUser.plan ||
        "free";

    const planName =
        currentUsage.planName ||
        capitalize(plan);

    const unlimited =
        Boolean(
            currentUsage.unlimited ||
            currentUsage.dailyLimit ===
                null
        );

    const used =
        Number(
            currentUsage.usedToday ||
            0
        );

    const limit =
        unlimited
            ? null
            : Number(
                currentUsage.dailyLimit ||
                20
            );

    const remaining =
        unlimited
            ? null
            : Math.max(
                0,
                Number(
                    currentUsage
                        .remainingToday ??
                    limit - used
                )
            );

    const percentage =
        getUsagePercentage(
            currentUsage
        );

    const warning =
        !unlimited &&
        percentage >= 80 &&
        percentage < 100;

    const limitReached =
        !unlimited &&
        (
            currentUsage.limitReached ||
            used >= limit
        );

    /*
     * Account dropdown usage
     */

    clearUsageClasses(
        elements.accountUsage
    );

    if (
        elements.accountUsageLabel
    ) {
        elements.accountUsageLabel.textContent =
            `${planName.toUpperCase()} PLAN`;
    }

    if (
        elements.accountUsageCount
    ) {
        elements.accountUsageCount.textContent =
            unlimited
                ? `${used} / Unlimited`
                : `${used} / ${limit}`;
    }

    if (
        elements.accountUsageRemaining
    ) {
        elements.accountUsageRemaining.textContent =
            unlimited
                ? "Unlimited transformations"
                : limitReached
                    ? "Daily transformation limit reached"
                    : `${remaining} transformation${remaining === 1 ? "" : "s"} remaining today`;
    }

    if (
        elements.accountUsageReset
    ) {
        elements.accountUsageReset.textContent =
            formatUsageReset();
    }

    setUsageProgressBar(
        elements.accountUsageBar,
        unlimited
            ? 0
            : percentage
    );

    /*
     * Workspace usage
     */

    clearUsageClasses(
        elements.workspaceUsage
    );

    if (
        elements.workspaceUsagePlan
    ) {
        elements.workspaceUsagePlan.textContent =
            `${planName.toUpperCase()} PLAN`;
    }

    if (
        elements.workspaceUsageCount
    ) {
        elements.workspaceUsageCount.textContent =
            unlimited
                ? `${used} / Unlimited`
                : `${used} / ${limit}`;
    }

    if (
        elements.workspaceUsageRemaining
    ) {
        elements.workspaceUsageRemaining.textContent =
            unlimited
                ? "Unlimited transformations"
                : limitReached
                    ? "Daily transformation limit reached"
                    : `${remaining} transformation${remaining === 1 ? "" : "s"} remaining today`;
    }

    if (
        elements.workspaceUsageReset
    ) {
        elements.workspaceUsageReset.textContent =
            formatUsageReset();
    }

    setUsageProgressBar(
        elements.workspaceUsageBar,
        unlimited
            ? 0
            : percentage
    );

    /*
     * Visual states
     */

    if (unlimited) {
        elements.accountUsage
            ?.classList.add(
                "usage-unlimited"
            );

        elements.workspaceUsage
            ?.classList.add(
                "usage-unlimited"
            );
    }

    if (warning) {
        elements.accountUsage
            ?.classList.add(
                "usage-warning"
            );

        elements.workspaceUsage
            ?.classList.add(
                "usage-warning"
            );
    }

    if (limitReached) {
        elements.accountUsage
            ?.classList.add(
                "usage-limit-reached"
            );

        elements.workspaceUsage
            ?.classList.add(
                "usage-limit-reached"
            );
    }

    updateTransformButtonForUsage();
}


async function refreshDailyUsage() {
    if (
        !currentUser ||
        !authToken
    ) {
        renderDailyUsage(null);
        return null;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/usage`,
                {
                    headers: {
                        ...getAuthHeaders()
                    }
                }
            );

        const data =
            await response.json();

        if (
            response.status === 401
        ) {
            throw new Error(
                "SESSION_EXPIRED"
            );
        }

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                "Unable to load daily usage."
            );
        }

        /*
         * Supports both:
         * { success:true, usage:{...} }
         * and direct usage fields.
         */
        const usage =
            data.usage ||
            data.dailyUsage ||
            (
                data.usedToday !==
                undefined
                    ? data
                    : null
            );

        if (usage) {
            currentUser.usage =
                usage;

            renderDailyUsage(
                usage
            );
        }

        return usage;

    } catch (error) {
        if (
            error.message ===
            "SESSION_EXPIRED"
        ) {
            removeAuthToken();

            currentUser = null;

            renderAccountState();

            renderLocalHistory();
        }

        return null;
    }
}


function showDailyLimitMessage() {
    setActionMessage(
        "You have reached your 20 free transformations for today. Your allowance will reset automatically tomorrow.",
        "error"
    );

    showToast(
        "Daily limit reached",
        "Your Free plan allowance resets daily at 00:00 UTC.",
        "!"
    );

    updateTransformButtonForUsage();
}


/* =========================================================
   ACCOUNT UI
========================================================= */

function renderAccountState() {
    const loggedIn =
        Boolean(
            currentUser &&
            authToken
        );

    elements.guestActions
        ?.classList.toggle(
            "hidden",
            loggedIn
        );

    elements.accountMenuWrapper
        ?.classList.toggle(
            "hidden",
            !loggedIn
        );

    elements.historyAccountBanner
        ?.classList.toggle(
            "hidden",
            loggedIn
        );

    if (!loggedIn) {
        if (
            elements.saveStatusText
        ) {
            elements.saveStatusText.textContent =
                "Sign in to save your transformation history across sessions.";
        }

        if (
            elements.historyDescription
        ) {
            elements.historyDescription.textContent =
                "Keep track of your latest Humanora results. Sign in to sync your transformation history with your account.";
        }

        if (
            elements.heroAccountBtn
        ) {
            elements.heroAccountBtn.textContent =
                "Create Free Account";
        }

        if (
            elements.finalAccountBtn
        ) {
            elements.finalAccountBtn.textContent =
                "Create Free Account";
        }

        renderDailyUsage(null);

        return;
    }

    const name =
        currentUser.name ||
        "Humanora User";

    const email =
        currentUser.email ||
        "";

    const plan =
        capitalize(
            currentUser.plan ||
            "free"
        );

    const total =
        Number(
            currentUser
                .totalTransformations ||
            0
        );

    const initial =
        getInitial(name);

    if (
        elements.accountAvatar
    ) {
        elements.accountAvatar.textContent =
            initial;
    }

    if (
        elements.accountDropdownAvatar
    ) {
        elements.accountDropdownAvatar.textContent =
            initial;
    }

    if (
        elements.accountTriggerName
    ) {
        elements.accountTriggerName.textContent =
            name;
    }

    if (
        elements.accountTriggerPlan
    ) {
        elements.accountTriggerPlan.textContent =
            plan;
    }

    if (
        elements.accountDropdownName
    ) {
        elements.accountDropdownName.textContent =
            name;
    }

    if (
        elements.accountDropdownEmail
    ) {
        elements.accountDropdownEmail.textContent =
            email;
    }

    if (
        elements.accountTransformations
    ) {
        elements.accountTransformations.textContent =
            total;
    }

    if (
        elements.accountPlan
    ) {
        elements.accountPlan.textContent =
            plan;
    }

    if (
        elements.saveStatusText
    ) {
        elements.saveStatusText.textContent =
            "Signed in — successful transformations are saved to your Humanora account.";
    }

    if (
        elements.historyDescription
    ) {
        elements.historyDescription.textContent =
            "Your recent transformations saved to your Humanora account.";
    }

    if (
        elements.heroAccountBtn
    ) {
        elements.heroAccountBtn.textContent =
            "My Account";
    }

    if (
        elements.finalAccountBtn
    ) {
        elements.finalAccountBtn.textContent =
            "My Account";
    }

    renderDailyUsage(
        currentUser.usage ||
        null
    );
}


function toggleAccountDropdown() {
    if (
        !currentUser ||
        !elements.accountDropdown
    ) {
        return;
    }

    const isOpen =
        !elements.accountDropdown
            .classList.contains(
                "hidden"
            );

    elements.accountDropdown
        .classList.toggle(
            "hidden",
            isOpen
        );

    elements.accountTrigger
        ?.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );
}


function closeAccountDropdown() {
    elements.accountDropdown
        ?.classList.add(
            "hidden"
        );

    elements.accountTrigger
        ?.setAttribute(
            "aria-expanded",
            "false"
        );
}


/* =========================================================
   REGISTER
========================================================= */

async function registerUser(event) {
    event.preventDefault();

    const name =
        cleanText(
            elements.registerName
                ?.value
        );

    const email =
        cleanText(
            elements.registerEmail
                ?.value
        ).toLowerCase();

    const password =
        elements.registerPassword
            ?.value || "";

    clearAuthMessages();

    if (
        name.length < 2
    ) {
        setAuthMessage(
            elements.registerMessage,
            "Please enter your name."
        );

        return;
    }

    if (!email) {
        setAuthMessage(
            elements.registerMessage,
            "Please enter your email address."
        );

        return;
    }

    if (
        password.length < 8
    ) {
        setAuthMessage(
            elements.registerMessage,
            "Your password must contain at least 8 characters."
        );

        return;
    }

    setAuthButtonLoading(
        elements.registerSubmitBtn,
        true,
        "Create Account"
    );

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/auth/register`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            name,
                            email,
                            password
                        })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                data.message ||
                "Unable to create your account."
            );
        }

        if (
            !data.token ||
            !data.user
        ) {
            throw new Error(
                "Humanora received an incomplete account response."
            );
        }

        saveAuthToken(
            data.token
        );

        currentUser =
            data.user;

        /*
         * Backend may include usage
         * in the auth response.
         */
        if (data.usage) {
            currentUser.usage =
                data.usage;
        }

        renderAccountState();

        elements.registerForm
            ?.reset();

        closeAuthModal();

        /*
         * Fetch authoritative
         * current daily usage.
         */
        await refreshDailyUsage();

        /*
         * Load account history.
         */
        await loadAccountHistory();

        showToast(
            "Account created",
            `Welcome to Humanora, ${currentUser.name}.`
        );

    } catch (error) {
        setAuthMessage(
            elements.registerMessage,
            error.message ||
            "Unable to create your account."
        );

    } finally {
        setAuthButtonLoading(
            elements.registerSubmitBtn,
            false,
            "Create Account"
        );
    }
}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser(event) {
    event.preventDefault();

    const email =
        cleanText(
            elements.loginEmail
                ?.value
        ).toLowerCase();

    const password =
        elements.loginPassword
            ?.value || "";

    clearAuthMessages();

    if (
        !email ||
        !password
    ) {
        setAuthMessage(
            elements.loginMessage,
            "Enter your email and password."
        );

        return;
    }

    setAuthButtonLoading(
        elements.loginSubmitBtn,
        true,
        "Sign In"
    );

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/auth/login`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            email,
                            password
                        })
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                data.message ||
                "Unable to sign in."
            );
        }

        if (
            !data.token ||
            !data.user
        ) {
            throw new Error(
                "Humanora received an incomplete login response."
            );
        }

        saveAuthToken(
            data.token
        );

        currentUser =
            data.user;

        if (data.usage) {
            currentUser.usage =
                data.usage;
        }

        renderAccountState();

        elements.loginForm
            ?.reset();

        closeAuthModal();

        await refreshDailyUsage();

        await loadAccountHistory();

        showToast(
            "Welcome back",
            `Signed in as ${currentUser.name}.`
        );

    } catch (error) {
        setAuthMessage(
            elements.loginMessage,
            error.message ||
            "Unable to sign in."
        );

    } finally {
        setAuthButtonLoading(
            elements.loginSubmitBtn,
            false,
            "Sign In"
        );
    }
}


/* =========================================================
   RESTORE SESSION
========================================================= */

async function restoreSession() {
    if (!authToken) {
        currentUser = null;

        renderAccountState();

        renderLocalHistory();

        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/me`,
                {
                    headers: {
                        ...getAuthHeaders()
                    }
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success ||
            !data.user
        ) {
            throw new Error(
                "Session expired."
            );
        }

        currentUser =
            data.user;

        if (data.usage) {
            currentUser.usage =
                data.usage;
        }

        renderAccountState();

        await refreshDailyUsage();

        await loadAccountHistory();

    } catch (error) {
        removeAuthToken();

        currentUser = null;

        renderAccountState();

        renderLocalHistory();
    }
}


/* =========================================================
   LOGOUT
========================================================= */

function logoutUser() {
    removeAuthToken();

    currentUser = null;

    closeAccountDropdown();

    renderAccountState();

    renderLocalHistory();

    showToast(
        "Signed out",
        "You have been signed out of Humanora."
    );
}


/* =========================================================
   API RESPONSE HELPER
========================================================= */

function getTransformationResult(
    data
) {
    if (!data) {
        return "";
    }

    /*
     * IMPORTANT:
     * Current Humanora backend returns
     * the AI result as:
     *
     * data.humanizedText
     */
    return cleanText(
        data.humanizedText ||
        data.resultText ||
        data.transformedText ||
        data.result ||
        data.output ||
        data.text ||
        data.data?.humanizedText ||
        data.data?.resultText ||
        data.data?.transformedText ||
        data.data?.result ||
        data.data?.output ||
        ""
    );
}

/* =========================================================
   TRANSFORM LOADING STATE
========================================================= */

function setTransformLoading(loading) {
    if (elements.loadingCard) {
        elements.loadingCard.classList.toggle(
            "hidden",
            !loading
        );
    }

    if (elements.humanizeBtn) {
        if (loading) {
            elements.humanizeBtn.disabled = true;

            const buttonText =
                elements.humanizeBtn.querySelector(
                    ".btn-text"
                );

            if (buttonText) {
                buttonText.textContent =
                    "Transforming...";
            }
        } else {
            updateTransformButtonForUsage();
        }
    }

    if (elements.regenerateBtn) {
        elements.regenerateBtn.disabled =
            loading;
    }
}


/* =========================================================
   STYLE-BASED WRITING ANALYSIS

   IMPORTANT:
   This is a writing-style estimate only.
   It does not prove whether text was written by AI
   or by a human.
========================================================= */

function analyseWritingStyle(text) {
    const cleaned =
        cleanText(text);

    if (!cleaned) {
        return {
            humanLikelihoodEstimate: 0,
            aiLikelihoodEstimate: 0,
            analysisLabel: "No text",
            analysisExplanation:
                "Add text to view the writing-style estimate."
        };
    }

    const words =
        cleaned
            .split(/\s+/)
            .filter(Boolean);

    const sentences =
        cleaned
            .split(/[.!?]+/)
            .map(
                (sentence) =>
                    sentence.trim()
            )
            .filter(Boolean);

    const wordCount =
        words.length;

    const sentenceCount =
        Math.max(
            1,
            sentences.length
        );

    const averageSentenceLength =
        wordCount /
        sentenceCount;

    const uniqueWords =
        new Set(
            words.map(
                (word) =>
                    word
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9']/gi,
                            ""
                        )
            )
        );

    const vocabularyRatio =
        wordCount
            ? uniqueWords.size /
              wordCount
            : 0;

    let formulaicScore = 45;

    if (
        averageSentenceLength > 26
    ) {
        formulaicScore += 8;
    }

    if (
        averageSentenceLength < 8
    ) {
        formulaicScore -= 5;
    }

    if (
        vocabularyRatio > 0.7
    ) {
        formulaicScore -= 5;
    }

    const formalPhrases = [
        "it is important to note",
        "in conclusion",
        "furthermore",
        "moreover",
        "therefore",
        "in today's world",
        "plays a crucial role",
        "it can be said",
        "in order to",
        "as a result"
    ];

    formalPhrases.forEach(
        (phrase) => {
            if (
                cleaned
                    .toLowerCase()
                    .includes(phrase)
            ) {
                formulaicScore += 4;
            }
        }
    );

    const contractions =
        cleaned.match(
            /\b(?:i'm|you're|we're|they're|don't|doesn't|can't|won't|isn't|aren't|it's|that's|there's|i've|we've|you've)\b/gi
        ) || [];

    if (
        contractions.length > 0
    ) {
        formulaicScore -=
            Math.min(
                8,
                contractions.length * 2
            );
    }

    const sentenceLengths =
        sentences.map(
            (sentence) =>
                sentence
                    .split(/\s+/)
                    .filter(Boolean)
                    .length
        );

    if (
        sentenceLengths.length >= 3
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
                minLength >
            12
        ) {
            formulaicScore -= 5;
        }
    }

    formulaicScore =
        Math.max(
            10,
            Math.min(
                90,
                Math.round(
                    formulaicScore
                )
            )
        );

    const humanScore =
        100 -
        formulaicScore;

    let label =
        "Balanced writing style";

    if (
        humanScore >= 70
    ) {
        label =
            "Natural writing style";
    } else if (
        humanScore >= 50
    ) {
        label =
            "Mostly natural writing style";
    } else if (
        humanScore >= 35
    ) {
        label =
            "Structured writing style";
    } else {
        label =
            "Highly structured writing style";
    }

    return {
        humanLikelihoodEstimate:
            humanScore,

        aiLikelihoodEstimate:
            formulaicScore,

        analysisLabel:
            label,

        analysisExplanation:
            "This is a style-based estimate based on wording, sentence variation and structure. It is not proof of AI or human authorship."
    };
}


/* =========================================================
   NORMALIZE BACKEND ANALYSIS
========================================================= */

function normalizeAnalysis(
    analysis,
    fallbackText = ""
) {
    if (
        !analysis ||
        typeof analysis !== "object"
    ) {
        return analyseWritingStyle(
            fallbackText
        );
    }

    let aiScore =
        Number(
            analysis.aiLikelihoodEstimate
        );

    let humanScore =
        Number(
            analysis.humanLikelihoodEstimate
        );

    if (
        !Number.isFinite(aiScore) &&
        Number.isFinite(humanScore)
    ) {
        aiScore =
            100 -
            humanScore;
    }

    if (
        !Number.isFinite(humanScore) &&
        Number.isFinite(aiScore)
    ) {
        humanScore =
            100 -
            aiScore;
    }

    if (
        !Number.isFinite(aiScore) ||
        !Number.isFinite(humanScore)
    ) {
        return analyseWritingStyle(
            fallbackText
        );
    }

    aiScore =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(aiScore)
            )
        );

    humanScore =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(humanScore)
            )
        );

    return {
        humanLikelihoodEstimate:
            humanScore,

        aiLikelihoodEstimate:
            aiScore,

        analysisLabel:
            analysis.analysisLabel ||
            (
                humanScore >= 70
                    ? "Natural writing style"
                    : humanScore >= 50
                        ? "Mostly natural writing style"
                        : "Structured writing style"
            ),

        analysisExplanation:
            analysis.analysisExplanation ||
            "This is a style-based estimate, not proof of AI or human authorship."
    };
}


/* =========================================================
   RENDER ANALYSIS
========================================================= */

function renderAnalysis(
    originalAnalysis,
    resultAnalysis
) {
    if (!elements.analysis) {
        return;
    }

    const original =
        normalizeAnalysis(
            originalAnalysis,
            currentOriginalText
        );

    const result =
        normalizeAnalysis(
            resultAnalysis,
            currentResultText
        );

    elements.analysis.classList.remove(
        "hidden"
    );

    if (
        elements.originalHumanLabel
    ) {
        elements.originalHumanLabel.textContent =
            original.analysisLabel;
    }

    if (
        elements.originalHumanPercentage
    ) {
        elements.originalHumanPercentage.textContent =
            `${original.humanLikelihoodEstimate}%`;
    }

    if (
        elements.originalAiPercentage
    ) {
        elements.originalAiPercentage.textContent =
            `${original.aiLikelihoodEstimate}%`;
    }

    if (
        elements.originalHumanFill
    ) {
        elements.originalHumanFill.style.width =
            `${original.humanLikelihoodEstimate}%`;
    }

    if (
        elements.originalAiFill
    ) {
        elements.originalAiFill.style.width =
            `${original.aiLikelihoodEstimate}%`;
    }

    if (
        elements.originalExplanation
    ) {
        elements.originalExplanation.textContent =
            original.analysisExplanation;
    }

    if (
        elements.resultHumanLabel
    ) {
        elements.resultHumanLabel.textContent =
            result.analysisLabel;
    }

    if (
        elements.resultHumanPercentage
    ) {
        elements.resultHumanPercentage.textContent =
            `${result.humanLikelihoodEstimate}%`;
    }

    if (
        elements.resultAiPercentage
    ) {
        elements.resultAiPercentage.textContent =
            `${result.aiLikelihoodEstimate}%`;
    }

    if (
        elements.resultHumanFill
    ) {
        elements.resultHumanFill.style.width =
            `${result.humanLikelihoodEstimate}%`;
    }

    if (
        elements.resultAiFill
    ) {
        elements.resultAiFill.style.width =
            `${result.aiLikelihoodEstimate}%`;
    }

    if (
        elements.resultExplanation
    ) {
        elements.resultExplanation.textContent =
            result.analysisExplanation;
    }

    const difference =
        result.humanLikelihoodEstimate -
        original.humanLikelihoodEstimate;

    if (
        elements.scoreChange
    ) {
        elements.scoreChange.textContent =
            difference === 0
                ? "0%"
                : `${difference > 0 ? "+" : ""}${difference}%`;
    }

    if (
        difference > 0
    ) {
        if (
            elements.scoreChangeTitle
        ) {
            elements.scoreChangeTitle.textContent =
                "More natural writing style";
        }

        if (
            elements.scoreChangeText
        ) {
            elements.scoreChangeText.textContent =
                `The result scored ${Math.abs(difference)} percentage points higher on this style-based naturalness estimate.`;
        }
    } else if (
        difference < 0
    ) {
        if (
            elements.scoreChangeTitle
        ) {
            elements.scoreChangeTitle.textContent =
                "Style estimate changed";
        }

        if (
            elements.scoreChangeText
        ) {
            elements.scoreChangeText.textContent =
                `The result scored ${Math.abs(difference)} percentage points lower on this style-based naturalness estimate.`;
        }
    } else {
        if (
            elements.scoreChangeTitle
        ) {
            elements.scoreChangeTitle.textContent =
                "Similar writing style";
        }

        if (
            elements.scoreChangeText
        ) {
            elements.scoreChangeText.textContent =
                "The original and transformed text received the same style-based estimate.";
        }
    }
}


function resetAnalysis() {
    elements.analysis
        ?.classList.add(
            "hidden"
        );
}


/* =========================================================
   MAIN TRANSFORMATION
========================================================= */

async function transformText({
    regenerate = false
} = {}) {

    const text =
        cleanText(
            elements.inputText
                ?.value
        );

    if (!text) {
        setActionMessage(
            "Please enter some text first.",
            "error"
        );

        elements.inputText
            ?.focus();

        return;
    }

    if (
        text.length >
        MAX_TEXT_LENGTH
    ) {
        setActionMessage(
            `Please keep your text under ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
            "error"
        );

        return;
    }

    /*
     * Logged-in Free account:
     * stop before calling AI if
     * today's limit is already reached.
     */
    if (
        currentUser &&
        hasReachedDailyLimit()
    ) {
        showDailyLimitMessage();
        return;
    }

    const tone =
        elements.tone?.value ||
        "natural";

    setActionMessage("");

    setTransformLoading(
        true
    );

    if (!regenerate) {
        currentOriginalText =
            text;

        resetResultVersions();
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/humanize`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        ...getAuthHeaders()
                    },

                    body:
                        JSON.stringify({
                            text,
                            mode:
                                selectedMode,
                            tone,
                            strength:
                                selectedStrength
                        })
                }
            );

        let data = null;

        try {
            data =
                await response.json();
        } catch (jsonError) {
            throw new Error(
                "Humanora received an invalid response from the server."
            );
        }

        /*
         * Backend daily limit response.
         */
        if (
            response.status === 429 &&
            (
                data?.code ===
                    "DAILY_LIMIT_REACHED" ||
                data?.usage
                    ?.limitReached
            )
        ) {
            if (
                data?.usage &&
                currentUser
            ) {
                currentUser.usage =
                    data.usage;

                renderDailyUsage(
                    data.usage
                );
            }

            throw new Error(
                data?.error ||
                "You have reached your daily transformation limit."
            );
        }

        if (
            !response.ok ||
            data?.success === false
        ) {
            throw new Error(
                data?.error ||
                data?.message ||
                "Humanora could not transform your text."
            );
        }

        /*
         * IMPORTANT:
         * server.js returns:
         *
         * {
         *   success: true,
         *   humanizedText: "...",
         *   ...
         * }
         */
        const result =
            getTransformationResult(
                data
            );

        if (!result) {
            console.error(
                "Humanora transformation response:",
                data
            );

            throw new Error(
                "Humanora did not receive a transformed result. Please try again."
            );
        }

        currentOriginalText =
            cleanText(
                data.originalText ||
                text
            );

        setOutput(
            result
        );

        addResultVersion(
            result
        );

        /*
         * Backend returns these
         * analysis objects.
         */
        renderAnalysis(
            data.originalAnalysis,
            data.humanizedAnalysis
        );

        /*
         * Update account quota from
         * the exact backend response.
         */
        if (
            currentUser &&
            data.usage
        ) {
            currentUser.usage =
                data.usage;

            renderDailyUsage(
                data.usage
            );
        }

        /*
         * Keep total transformation
         * count visually updated.
         */
        if (currentUser) {
            const currentTotal =
                Number(
                    currentUser
                        .totalTransformations ||
                    0
                );

            currentUser.totalTransformations =
                currentTotal + 1;

            if (
                elements.accountTransformations
            ) {
                elements.accountTransformations.textContent =
                    currentUser
                        .totalTransformations;
            }
        }

        setActionMessage(
            regenerate
                ? "A new version has been generated."
                : "Your text was transformed successfully.",
            "success"
        );

        /*
         * Logged-in history is already
         * saved by the backend.
         *
         * Guest history is stored locally.
         */
        if (currentUser) {
            await loadAccountHistory();
        } else {
            saveLocalHistoryItem({
                id:
                    `local-${Date.now()}`,

                originalText:
                    currentOriginalText,

                humanizedText:
                    result,

                mode:
                    selectedMode,

                tone,

                strength:
                    selectedStrength,

                createdAt:
                    new Date()
                        .toISOString()
            });

            renderLocalHistory();
        }

        /*
         * Refresh authoritative quota
         * after successful account transform.
         */
        if (currentUser) {
            await refreshDailyUsage();
        }

    } catch (error) {
        console.error(
            "Humanora transformation error:",
            error
        );

        setActionMessage(
            error.message ||
            "Something went wrong. Please try again.",
            "error"
        );

        if (
            String(
                error.message || ""
            )
                .toLowerCase()
                .includes(
                    "daily"
                )
        ) {
            await refreshDailyUsage();
        }

    } finally {
        setTransformLoading(
            false
        );
    }
}


/* =========================================================
   LOCAL HISTORY
========================================================= */

function getLocalHistory() {
    try {
        const stored =
            localStorage.getItem(
                LOCAL_HISTORY_KEY
            );

        if (!stored) {
            return [];
        }

        const parsed =
            JSON.parse(stored);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {
        console.error(
            "Unable to read Humanora local history:",
            error
        );

        return [];
    }
}


function saveLocalHistory(
    history
) {
    try {
        localStorage.setItem(
            LOCAL_HISTORY_KEY,
            JSON.stringify(
                history
            )
        );

    } catch (error) {
        console.error(
            "Unable to save Humanora local history:",
            error
        );
    }
}


function saveLocalHistoryItem(
    item
) {
    const history =
        getLocalHistory();

    history.unshift(
        item
    );

    const trimmed =
        history.slice(
            0,
            MAX_LOCAL_HISTORY
        );

    saveLocalHistory(
        trimmed
    );
}


function clearLocalHistory() {
    localStorage.removeItem(
        LOCAL_HISTORY_KEY
    );

    renderLocalHistory();

    showToast(
        "History cleared",
        "Your local Humanora history has been cleared."
    );
}


/* =========================================================
   HISTORY ITEM NORMALIZER
========================================================= */

function normalizeHistoryItem(
    item
) {
    return {
        id:
            item?.id ||
            item?.publicId ||
            "",

        originalText:
            cleanText(
                item?.originalText ||
                item?.original_text ||
                ""
            ),

        humanizedText:
            cleanText(
                item?.humanizedText ||
                item?.humanized_text ||
                item?.resultText ||
                item?.result ||
                ""
            ),

        mode:
            item?.mode ||
            "humanize",

        tone:
            item?.tone ||
            "natural",

        strength:
            item?.strength ||
            "medium",

        createdAt:
            item?.createdAt ||
            item?.created_at ||
            new Date()
                .toISOString()
    };
}


/* =========================================================
   HISTORY DATE
========================================================= */

function formatHistoryDate(
    value
) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return date.toLocaleString(
        undefined,
        {
            dateStyle:
                "medium",

            timeStyle:
                "short"
        }
    );
}


/* =========================================================
   RENDER HISTORY
========================================================= */

function renderHistoryItems(
    rawItems = [],
    accountHistory = false
) {
    if (
        !elements.historyGrid
    ) {
        return;
    }

    const items =
        rawItems
            .map(
                normalizeHistoryItem
            )
            .filter(
                (item) =>
                    item.originalText ||
                    item.humanizedText
            );

    elements.historyGrid.innerHTML =
        "";

    if (
        items.length === 0
    ) {
        elements.historyEmpty
            ?.classList.remove(
                "hidden"
            );

        elements.clearHistoryBtn
            ?.classList.add(
                "hidden"
            );

        return;
    }

    elements.historyEmpty
        ?.classList.add(
            "hidden"
        );

    elements.clearHistoryBtn
        ?.classList.remove(
            "hidden"
        );

    items.forEach(
        (item) => {
            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "history-item";

            const modeLabel =
                modeData[
                    item.mode
                ]?.label ||
                capitalize(
                    item.mode
                );

            card.innerHTML = `
                <div class="history-item-top">
                    <div class="history-item-meta">
                        <span class="history-mode">
                            ${escapeHTML(modeLabel)}
                        </span>

                        <span>
                            ${escapeHTML(capitalize(item.tone))}
                        </span>

                        <span>
                            ${escapeHTML(capitalize(item.strength))}
                        </span>
                    </div>

                    <span class="history-date">
                        ${escapeHTML(formatHistoryDate(item.createdAt))}
                    </span>
                </div>

                <div class="history-item-content">
                    <div class="history-item-column">
                        <span class="history-column-label">
                            Original
                        </span>

                        <p>
                            ${escapeHTML(truncateText(item.originalText, 260))}
                        </p>
                    </div>

                    <div class="history-item-arrow">
                        →
                    </div>

                    <div class="history-item-column">
                        <span class="history-column-label">
                            Result
                        </span>

                        <p>
                            ${escapeHTML(truncateText(item.humanizedText, 260))}
                        </p>
                    </div>
                </div>

                <div class="history-item-actions">
                    <button
                        type="button"
                        class="history-use-btn"
                    >
                        Use Result
                    </button>

                    <button
                        type="button"
                        class="history-copy-btn"
                    >
                        Copy
                    </button>

                    ${
                        accountHistory &&
                        item.id
                            ? `
                                <button
                                    type="button"
                                    class="history-delete-btn"
                                >
                                    Delete
                                </button>
                            `
                            : ""
                    }
                </div>
            `;

            const useButton =
                card.querySelector(
                    ".history-use-btn"
                );

            const copyButton =
                card.querySelector(
                    ".history-copy-btn"
                );

            const deleteButton =
                card.querySelector(
                    ".history-delete-btn"
                );

            useButton
                ?.addEventListener(
                    "click",
                    () => {
                        if (
                            elements.inputText
                        ) {
                            elements.inputText.value =
                                item.originalText;

                            updateInputStats();
                        }

                        selectedMode =
                            item.mode;

                        selectedStrength =
                            item.strength;

                        selectMode(
                            item.mode
                        );

                        selectStrength(
                            item.strength
                        );

                        if (
                            elements.tone
                        ) {
                            elements.tone.value =
                                item.tone;
                        }

                        currentOriginalText =
                            item.originalText;

                        resetResultVersions();

                        addResultVersion(
                            item.humanizedText
                        );

                        setOutput(
                            item.humanizedText
                        );

                        scrollToSection(
                            "workspace"
                        );
                    }
                );

            copyButton
                ?.addEventListener(
                    "click",
                    async () => {
                        try {
                            await copyText(
                                item.humanizedText
                            );

                            showToast(
                                "Copied",
                                "The saved Humanora result was copied."
                            );

                        } catch (error) {
                            showToast(
                                "Copy failed",
                                "Your browser could not copy this result.",
                                "!"
                            );
                        }
                    }
                );

            if (
                deleteButton &&
                accountHistory
            ) {
                deleteButton.addEventListener(
                    "click",
                    async () => {
                        await deleteAccountHistoryItem(
                            item.id
                        );
                    }
                );
            }

            elements.historyGrid.appendChild(
                card
            );
        }
    );
}


function renderLocalHistory() {
    if (currentUser) {
        return;
    }

    const history =
        getLocalHistory();

    renderHistoryItems(
        history,
        false
    );
}


/* =========================================================
   ACCOUNT HISTORY
========================================================= */

async function loadAccountHistory() {
    if (
        !currentUser ||
        !authToken
    ) {
        renderLocalHistory();
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/history`,
                {
                    headers: {
                        ...getAuthHeaders()
                    }
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                "Unable to load account history."
            );
        }

        const history =
            data.history ||
            data.transformations ||
            data.items ||
            [];

        renderHistoryItems(
            Array.isArray(history)
                ? history
                : [],
            true
        );

    } catch (error) {
        console.error(
            "Humanora history error:",
            error
        );

        if (
            elements.historyGrid
        ) {
            elements.historyGrid.innerHTML =
                "";
        }

        elements.historyEmpty
            ?.classList.remove(
                "hidden"
            );
    }
}


/* =========================================================
   DELETE ACCOUNT HISTORY ITEM
========================================================= */

async function deleteAccountHistoryItem(
    id
) {
    if (
        !id ||
        !currentUser ||
        !authToken
    ) {
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/history/${encodeURIComponent(id)}`,
                {
                    method:
                        "DELETE",

                    headers: {
                        ...getAuthHeaders()
                    }
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                "Unable to delete this transformation."
            );
        }

        await loadAccountHistory();

        /*
         * Deleting history must NOT
         * reduce daily usage.
         */
        await refreshDailyUsage();

        showToast(
            "Transformation deleted",
            "The history item was removed. Your daily usage is unchanged."
        );

    } catch (error) {
        showToast(
            "Could not delete",
            error.message ||
            "Unable to delete this transformation.",
            "!"
        );
    }
}


/* =========================================================
   CLEAR ACCOUNT HISTORY
========================================================= */

async function clearAccountHistory() {
    if (
        !currentUser ||
        !authToken
    ) {
        return;
    }

    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/history`,
                {
                    method:
                        "DELETE",

                    headers: {
                        ...getAuthHeaders()
                    }
                }
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                "Unable to clear your history."
            );
        }

        await loadAccountHistory();

        /*
         * History deletion and
         * daily quota are independent.
         */
        await refreshDailyUsage();

        showToast(
            "History cleared",
            "Your account history was cleared. Your daily usage is unchanged."
        );

    } catch (error) {
        showToast(
            "Could not clear history",
            error.message ||
            "Unable to clear your account history.",
            "!"
        );
    }
}

/* =========================================================
   COPY HELPER
========================================================= */

async function copyText(text) {
    const cleaned =
        cleanText(text);

    if (!cleaned) {
        return;
    }

    if (
        navigator.clipboard &&
        window.isSecureContext
    ) {
        await navigator.clipboard.writeText(
            cleaned
        );

        return;
    }

    const textarea =
        document.createElement(
            "textarea"
        );

    textarea.value =
        cleaned;

    textarea.style.position =
        "fixed";

    textarea.style.opacity =
        "0";

    document.body.appendChild(
        textarea
    );

    textarea.focus();
    textarea.select();

    document.execCommand(
        "copy"
    );

    textarea.remove();
}


/* =========================================================
   COPY OUTPUT
========================================================= */

async function copyOutput() {
    if (
        !currentResultText
    ) {
        showToast(
            "Nothing to copy",
            "Create a Humanora result first.",
            "!"
        );

        return;
    }

    try {
        await copyText(
            currentResultText
        );

        showToast(
            "Copied",
            "Your Humanora result was copied."
        );

    } catch (error) {
        showToast(
            "Copy failed",
            "Your browser could not copy the result.",
            "!"
        );
    }
}


/* =========================================================
   DOWNLOAD OUTPUT
========================================================= */

function downloadOutput() {
    if (
        !currentResultText
    ) {
        showToast(
            "Nothing to download",
            "Create a Humanora result first.",
            "!"
        );

        return;
    }

    const blob =
        new Blob(
            [
                currentResultText
            ],
            {
                type:
                    "text/plain;charset=utf-8"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const link =
        document.createElement(
            "a"
        );

    link.href =
        url;

    link.download =
        `humanora-${selectedMode}-${Date.now()}.txt`;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
        url
    );

    showToast(
        "Downloaded",
        "Your Humanora result was downloaded."
    );
}


/* =========================================================
   COMPARE MODAL
========================================================= */

function openCompareModal() {
    if (
        !currentOriginalText ||
        !currentResultText
    ) {
        showToast(
            "Nothing to compare",
            "Create a Humanora result first.",
            "!"
        );

        return;
    }

    if (
        elements.compareMode
    ) {
        elements.compareMode.textContent =
            modeData[
                selectedMode
            ]?.label ||
            capitalize(
                selectedMode
            );
    }

    if (
        elements.compareTone
    ) {
        elements.compareTone.textContent =
            capitalize(
                elements.tone
                    ?.value ||
                "natural"
            );
    }

    if (
        elements.compareStrength
    ) {
        elements.compareStrength.textContent =
            capitalize(
                selectedStrength
            );
    }

    if (
        elements.compareOriginalStats
    ) {
        elements.compareOriginalStats.textContent =
            formatStatsLine(
                currentOriginalText
            );
    }

    if (
        elements.compareResultStats
    ) {
        elements.compareResultStats.textContent =
            formatStatsLine(
                currentResultText
            );
    }

    if (
        elements.compareOriginalText
    ) {
        elements.compareOriginalText.textContent =
            currentOriginalText;
    }

    if (
        elements.compareResultText
    ) {
        elements.compareResultText.textContent =
            currentResultText;
    }

    elements.compareModal
        ?.classList.remove(
            "hidden"
        );

    elements.compareModal
        ?.setAttribute(
            "aria-hidden",
            "false"
        );

    document.body.classList.add(
        "modal-open"
    );
}


function closeCompareModal() {
    elements.compareModal
        ?.classList.add(
            "hidden"
        );

    elements.compareModal
        ?.setAttribute(
            "aria-hidden",
            "true"
        );

    document.body.classList.remove(
        "modal-open"
    );
}


/* =========================================================
   SAMPLE TEXT
========================================================= */

function insertSampleText() {
    if (
        !elements.inputText
    ) {
        return;
    }

    elements.inputText.value =
        "Artificial intelligence technology has become increasingly important in modern workplaces because it enables organizations to improve efficiency, automate repetitive tasks, and support employees in completing their responsibilities more effectively. However, businesses should also consider how these technologies affect communication, decision-making, and the overall experience of their employees.";

    updateInputStats();

    elements.inputText.focus();

    setActionMessage(
        "Sample text added. Choose your settings and transform it.",
        "success"
    );
}


/* =========================================================
   CLEAR INPUT
========================================================= */

function clearWorkspaceInput() {
    if (
        elements.inputText
    ) {
        elements.inputText.value =
            "";

        elements.inputText.focus();
    }

    updateInputStats();

    currentOriginalText =
        "";

    currentResultText =
        "";

    resetResultVersions();

    setOutput("");

    resetAnalysis();

    setActionMessage("");
}


/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

function togglePassword(
    button
) {
    const targetId =
        button?.dataset
            ?.passwordTarget;

    if (!targetId) {
        return;
    }

    const input =
        document.getElementById(
            targetId
        );

    if (!input) {
        return;
    }

    const show =
        input.type ===
        "password";

    input.type =
        show
            ? "text"
            : "password";

    button.textContent =
        show
            ? "Hide"
            : "Show";
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

function toggleMobileMenu() {
    elements.mainNav
        ?.classList.toggle(
            "open"
        );

    elements.mobileMenuBtn
        ?.classList.toggle(
            "active"
        );
}


function closeMobileMenu() {
    elements.mainNav
        ?.classList.remove(
            "open"
        );

    elements.mobileMenuBtn
        ?.classList.remove(
            "active"
        );
}


/* =========================================================
   BACKEND HEALTH CHECK
========================================================= */

async function checkBackendHealth() {
    try {
        const response =
            await fetch(
                `${API_BASE_URL}/api/health`
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                "Backend unavailable"
            );
        }

        console.log(
            "Humanora API connected:",
            data
        );

        return true;

    } catch (error) {
        console.error(
            "Humanora backend connection failed:",
            error
        );

        setActionMessage(
            "Humanora cannot connect to the AI server. Make sure the backend is running on port 3001.",
            "error"
        );

        return false;
    }
}


/* =========================================================
   SAFE EVENT HELPER
========================================================= */

function on(
    element,
    eventName,
    handler
) {
    if (!element) {
        return;
    }

    element.addEventListener(
        eventName,
        handler
    );
}


/* =========================================================
   EVENT LISTENERS
========================================================= */

function attachEventListeners() {

    /* -----------------------------------------
       MODE BUTTONS
    ----------------------------------------- */

    document
        .querySelectorAll(
            ".rewrite-mode"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        selectMode(
                            button.dataset
                                .mode
                        );
                    }
                );
            }
        );


    /* -----------------------------------------
       STRENGTH BUTTONS
    ----------------------------------------- */

    document
        .querySelectorAll(
            ".strength-btn"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        selectStrength(
                            button.dataset
                                .strength
                        );
                    }
                );
            }
        );


    /* -----------------------------------------
       INPUT
    ----------------------------------------- */

    on(
        elements.inputText,
        "input",
        () => {
            updateInputStats();

            const length =
                elements.inputText
                    ?.value.length ||
                0;

            if (
                elements.inputCharCount
            ) {
                elements.inputCharCount
                    .classList.toggle(
                        "limit-warning",
                        length >
                            MAX_TEXT_LENGTH
                    );
            }
        }
    );


    on(
        elements.clearInput,
        "click",
        clearWorkspaceInput
    );


    on(
        elements.trySampleText,
        "click",
        insertSampleText
    );


    /* -----------------------------------------
       TRANSFORM
    ----------------------------------------- */

    on(
        elements.humanizeBtn,
        "click",
        () => {
            transformText();
        }
    );


    on(
        elements.regenerateBtn,
        "click",
        () => {
            transformText({
                regenerate:
                    true
            });
        }
    );


    on(
        elements.undoResultBtn,
        "click",
        undoResult
    );


    on(
        elements.redoResultBtn,
        "click",
        redoResult
    );


    /* -----------------------------------------
       COPY / DOWNLOAD
    ----------------------------------------- */

    on(
        elements.copyOutput,
        "click",
        copyOutput
    );


    on(
        elements.downloadOutput,
        "click",
        downloadOutput
    );


    /* -----------------------------------------
       COMPARE
    ----------------------------------------- */

    on(
        elements.compareBtn,
        "click",
        openCompareModal
    );


    on(
        elements.closeCompareBtn,
        "click",
        closeCompareModal
    );


    on(
        elements.compareModalBackdrop,
        "click",
        closeCompareModal
    );


    on(
        elements.compareDoneBtn,
        "click",
        closeCompareModal
    );


    on(
        elements.compareCopyBtn,
        "click",
        async () => {
            if (
                !currentResultText
            ) {
                return;
            }

            try {
                await copyText(
                    currentResultText
                );

                showToast(
                    "Copied",
                    "The transformed result was copied."
                );

            } catch (error) {
                showToast(
                    "Copy failed",
                    "Your browser could not copy the result.",
                    "!"
                );
            }
        }
    );


    /* -----------------------------------------
       HEADER AUTH
    ----------------------------------------- */

    on(
        elements.headerLoginBtn,
        "click",
        () => {
            openAuthModal(
                "login"
            );
        }
    );


    on(
        elements.headerRegisterBtn,
        "click",
        () => {
            openAuthModal(
                "register"
            );
        }
    );


    on(
        elements.historySignUpBtn,
        "click",
        () => {
            openAuthModal(
                "register"
            );
        }
    );


    /* -----------------------------------------
       HERO ACCOUNT
    ----------------------------------------- */

    on(
        elements.heroAccountBtn,
        "click",
        () => {
            if (
                currentUser
            ) {
                toggleAccountDropdown();
            } else {
                openAuthModal(
                    "register"
                );
            }
        }
    );


    /* -----------------------------------------
       FINAL CTA ACCOUNT
    ----------------------------------------- */

    on(
        elements.finalAccountBtn,
        "click",
        () => {
            if (
                currentUser
            ) {
                scrollToSection(
                    "history"
                );
            } else {
                openAuthModal(
                    "register"
                );
            }
        }
    );


    /* -----------------------------------------
       AUTH MODAL
    ----------------------------------------- */

    on(
        elements.closeAuthBtn,
        "click",
        closeAuthModal
    );


    on(
        elements.authBackdrop,
        "click",
        closeAuthModal
    );


    on(
        elements.loginTab,
        "click",
        () => {
            setAuthView(
                "login"
            );
        }
    );


    on(
        elements.registerTab,
        "click",
        () => {
            setAuthView(
                "register"
            );
        }
    );


    on(
        elements.switchToRegister,
        "click",
        () => {
            setAuthView(
                "register"
            );
        }
    );


    on(
        elements.switchToLogin,
        "click",
        () => {
            setAuthView(
                "login"
            );
        }
    );


    on(
        elements.loginForm,
        "submit",
        loginUser
    );


    on(
        elements.registerForm,
        "submit",
        registerUser
    );


    /* -----------------------------------------
       PASSWORD TOGGLES
    ----------------------------------------- */

    document
        .querySelectorAll(
            ".password-toggle"
        )
        .forEach(
            (button) => {
                button.addEventListener(
                    "click",
                    () => {
                        togglePassword(
                            button
                        );
                    }
                );
            }
        );


    /* -----------------------------------------
       ACCOUNT DROPDOWN
    ----------------------------------------- */

    on(
        elements.accountTrigger,
        "click",
        (event) => {
            event.stopPropagation();

            toggleAccountDropdown();
        }
    );


    on(
        elements.accountDropdown,
        "click",
        (event) => {
            event.stopPropagation();
        }
    );


    on(
        elements.accountHistoryBtn,
        "click",
        () => {
            closeAccountDropdown();

            scrollToSection(
                "history"
            );
        }
    );


    on(
        elements.logoutBtn,
        "click",
        logoutUser
    );


    /* -----------------------------------------
       CLEAR HISTORY
    ----------------------------------------- */

    on(
        elements.clearHistoryBtn,
        "click",
        () => {
            if (
                currentUser
            ) {
                clearAccountHistory();
            } else {
                clearLocalHistory();
            }
        }
    );


    /* -----------------------------------------
       MOBILE MENU
    ----------------------------------------- */

    on(
        elements.mobileMenuBtn,
        "click",
        toggleMobileMenu
    );


    elements.mainNav
        ?.querySelectorAll(
            "a"
        )
        .forEach(
            (link) => {
                link.addEventListener(
                    "click",
                    closeMobileMenu
                );
            }
        );


    /* -----------------------------------------
       GLOBAL CLICK
    ----------------------------------------- */

    document.addEventListener(
        "click",
        () => {
            closeAccountDropdown();
        }
    );


    /* -----------------------------------------
       KEYBOARD
    ----------------------------------------- */

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                "Escape"
            ) {
                if (
                    elements.authModal &&
                    !elements.authModal
                        .classList
                        .contains(
                            "hidden"
                        )
                ) {
                    closeAuthModal();
                }

                if (
                    elements.compareModal &&
                    !elements.compareModal
                        .classList
                        .contains(
                            "hidden"
                        )
                ) {
                    closeCompareModal();
                }

                closeAccountDropdown();
            }


            /*
             * Ctrl + Enter
             * or Cmd + Enter
             */
            if (
                (
                    event.ctrlKey ||
                    event.metaKey
                ) &&
                event.key ===
                    "Enter"
            ) {
                event.preventDefault();

                transformText();
            }
        }
    );


    /* -----------------------------------------
       REFRESH USAGE WHEN TAB RETURNS
    ----------------------------------------- */

    document.addEventListener(
        "visibilitychange",
        () => {
            if (
                document.visibilityState ===
                    "visible" &&
                currentUser
            ) {
                refreshDailyUsage();
            }
        }
    );


    window.addEventListener(
        "focus",
        () => {
            if (
                currentUser
            ) {
                refreshDailyUsage();
            }
        }
    );
}


/* =========================================================
   INITIAL UI STATE
========================================================= */

function initializeUIState() {
    selectMode(
        "humanize"
    );

    selectStrength(
        "medium"
    );

    updateInputStats();

    updateOutputStats("");

    setOutput("");

    resetAnalysis();

    updateVersionButtons();

    renderAccountState();
}


/* =========================================================
   INITIALIZE HUMANORA
========================================================= */

async function initializeHumanora() {
    console.log(
        "Humanora frontend starting..."
    );

    initializeUIState();

    attachEventListeners();

    /*
     * Check API separately.
     * Failure here does not crash
     * the frontend.
     */
    await checkBackendHealth();

    /*
     * Restore account session,
     * usage and history.
     */
    await restoreSession();

    console.log(
        "Humanora frontend ready."
    );
}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeHumanora
    );
} else {
    initializeHumanora();
}