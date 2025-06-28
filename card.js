// card.js

// Expose a global object to hold our card functions
window.RISKToolsCard = window.RISKToolsCard || {}; // Ensure namespace exists, don't overwrite

// Helper function to linearly interpolate between two colors
function lerpColor(color1, color2, t) {
    const r = Math.round(color1[0] + (color2[0] - color1[0]) * t);
    const g = Math.round(color1[1] + (color2[1] - color1[1]) * t);
    const b = Math.round(color1[2] + (color2[2] - color1[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
}

// Function to get the risk level text based on the score
function getRiskLevelText(score) {
    if (score === null || typeof score === "undefined") return "Data Unavailable";
    if (score < 100) return "Outrageously Dangerous";
    if (score < 200) return "Extremely Risky";
    if (score < 300) return "Highly Risky";
    if (score < 400) return "Risky";
    if (score < 500) return "A Bit Risky";
    if (score < 600) return "Moderately Safe";
    if (score < 700) return "Safe";
    if (score < 800) return "Very Safe";
    if (score < 900) return "Super Safe";
    return "Extremely Safe";
}

// Function to get the color based on the score
function getScoreColor(score) {
    if (score === null || typeof score === "undefined") {
        return lerpColor([255, 100, 100], [180, 100, 255], 0); // Reddish for N/A
    }
    if (score >= 900) {
        const t = (score - 900) / 100; // 900 -> 1000
        return lerpColor([54, 186, 63], [96, 225, 105], t); // Greenish
    } else if (score >= 800) {
        const t = (score - 800) / 100; // 800 -> 900
        return lerpColor([100, 100, 255], [54, 186, 63], t); // Bluish to greenish
    } else if (score >= 600) {
        const t = (score - 600) / 200; // 600 -> 800
        return lerpColor([50, 150, 200], [100, 100, 255], t); // Cyan to bluish
    } else {
        const t = score / 600; // 0 -> 600
        return lerpColor([255, 100, 100], [180, 100, 255], t); // Reddish to purplish
    }
}

window.RISKToolsCard.renderPlaceholderCard = function (username) {
    // This is the canonical placeholder card
    return `
<div class="w-80 p-4 md:p-6 rounded-lg text-white bg-slate-900 border-2 border-slate-700" style="background-color: #0F1729; box-sizing: border-box;">
    <div class="flex items-center mb-4 animate-pulse">
        <div class="w-12 h-12 rounded-full bg-slate-700 mr-2"></div>
        <div class="flex-1">
            <div class="h-4 bg-slate-700 rounded w-24 mb-1"></div>
            <div class="h-3 bg-slate-700 rounded w-32"></div>
        </div>
        <div class="ml-auto text-right">
            <div class="h-3 bg-slate-700 rounded w-16 mb-1"></div>
            <div class="h-6 bg-slate-700 rounded w-12"></div>
        </div>
    </div>
    <div class="mt-3 px-3 py-5 rounded-md bg-slate-800 text-center relative">
        <svg class="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <p class="text-xs mt-2 text-slate-400">Loading score for <strong>${username}</strong>...</p>
    </div>
</div>
  `;
};

window.RISKToolsCard.createRiskCardHTML = async function (
    username,
    passedUserData // Optional: data passed from content.js
) {
    let userData = passedUserData;

    try {
        if (!userData) {
            // If data wasn't passed (e.g. direct call or content.js failed to fetch), fetch it now.
            console.log(
                `RISK Tools (card.js): User data for ${username} not passed, fetching...`
            );
            const response = await fetch(
                `https://risk.markets/api/v0/score?username=${username}`
            );
            if (!response.ok) {
                console.error(
                    `RISK Tools (card.js): Failed to fetch user data for ${username}. Status: ${response.status}`
                );
                return `<div class="p-4 md:p-6 rounded-lg bg-slate-900 text-white" style="background-color: #0F1729; border: 2px solid #4A5568;">API Error: Could not load data for ${username}.</div>`;
            }
            userData = await response.json();
        }

        // Validate the (potentially newly fetched) userData
        if (
            !userData ||
            userData.userExists === false
        ) {
            console.warn(
                `RISK Tools (card.js): User ${username} not found or data incomplete.`, userData
            );
            return `<div class="p-4 md:p-6 rounded-lg bg-slate-900 text-white" style="background-color: #0F1729; border: 2px solid #4A5568;">User <strong>${username}</strong> not found on RISK Markets.</div>`;
        }

        // Credit score can be 0 (e.g. for Tumbles) or null if not set, which is fine.
        // AvatarURL and riskMultiplier should exist if userExists is true.
        if (typeof userData.creditScore === 'undefined' || !userData.avatarUrl || typeof userData.riskMultiplier === 'undefined') {
            console.error(`RISK Tools (card.js): Incomplete data for existing user ${username}`, userData);
            return `<div class="p-4 md:p-6 rounded-lg bg-slate-900 text-white" style="background-color: #0F1729; border: 2px solid #4A5568;">Incomplete data for ${username}. Score or other details missing.</div>`;
        }


        const creditScore = userData.creditScore;
        const avatarUrl = userData.avatarUrl;
        const riskMultiplier = userData.riskMultiplier;
        const riskLevelText = getRiskLevelText(creditScore);
        const scoreColor = getScoreColor(creditScore);
        // Use a slightly darker version of scoreColor for background or a fixed one
        const riskLevelBackgroundColor = scoreColor; // Or a calculated darker shade

        const formattedRiskMultiplier = (riskMultiplier * 100).toFixed(0);

        const cardContentHtml = `
<a href="https://risk.markets/chart/${username}" target="_blank" rel="noopener noreferrer" class="block w-80 p-4 md:p-6 rounded-lg text-white transition-all duration-100 cursor-pointer" style="border: 2px solid ${scoreColor}; background-color: #0F1729; box-sizing: border-box;" onmouseover="this.style.backgroundColor='#121c30';" onmouseout="this.style.backgroundColor='#0F1729';">
    <div class="flex-col items-center">
        <div class="flex items-center mb-4">
            <img src="${avatarUrl}" alt="${username}'s avatar" class="w-12 h-12 rounded-full mr-2 border border-slate-600">
            <div>
                <h2 class="text-xl font-semibold">${username}</h2>
                <p class="text-xs text-slate-400">Risk Multiplier: ${formattedRiskMultiplier}%</p>
            </div>
            <div class="flex flex-col text-right ml-auto">
                <span class="text-xs text-slate-400">Credit Score:</span>
                <span class="text-3xl font-bold" style="color: ${scoreColor};">${creditScore !== null ? creditScore : "N/A"
            }</span>
            </div>
        </div>
        <div class="mt-3 px-3 py-2 rounded-md relative" style="background-color: ${riskLevelBackgroundColor};">
            <div class="absolute inset-0 bg-black opacity-40 rounded-md" aria-hidden="true"></div>
            <div class="relative z-10">
                <p class="text-xs text-gray-100">Lending to this user is</p>
                <p class="text-sm text-white font-semibold">${riskLevelText}</p>
            </div>
            <svg stroke="currentColor" fill="none" stroke-width="2" class="absolute top-1/2 -translate-y-1/2 right-2 w-5 h-5 text-white opacity-70" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M4 16l6 -7l5 5l5 -6"></path><path d="M15 14m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path><path d="M10 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path><path d="M4 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path><path d="M20 8m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path></svg>
        </div>
    </div>
</a>
    `;
        return cardContentHtml;
    } catch (error) {
        console.error(
            `RISK Tools (card.js): Error creating risk card HTML for ${username}:`,
            error
        );
        return `<div class="p-4 md:p-6 rounded-lg bg-slate-900 text-white" style="background-color: #0F1729; border: 2px solid #4A5568;">An error occurred while preparing card for ${username}.</div>`;
    }
};
