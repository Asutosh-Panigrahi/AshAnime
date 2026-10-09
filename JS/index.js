
const ANILIST_API = "https://graphql.anilist.co";

// ========================================
// DOM ELEMENTS
// ========================================

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("anime-search");
const searchResults = document.getElementById("search-results");

const animeIndex = document.getElementById("anime-index");
const animePoster = document.getElementById("anime-poster");
const animeTitle = document.getElementById("anime-title");
const animeDescription = document.getElementById("anime-description");

const episodeNumber = document.getElementById("episode-number");
const currentEpisode = document.getElementById("current-episode");

// ========================================
// ANIList GRAPHQL QUERY
// ========================================

const SEARCH_ANIME_QUERY = `
    query ($search: String!) {
        Page(page: 1, perPage: 10) {
            media(
                search: $search
                type: ANIME
                isAdult: false
                sort: SEARCH_MATCH
            ) {
                id
                idMal

                title {
                    romaji
                    english
                    native
                }

                description(asHtml: false)

                episodes
                status
                season
                seasonYear
                format

                averageScore
                genres

                coverImage {
                    large
                    extraLarge
                }

                siteUrl
            }
        }
    }
`;

// ========================================
// API REQUEST
// ========================================

async function searchAnime(searchTerm) {
    const response = await fetch(ANILIST_API, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },

        body: JSON.stringify({
            query: SEARCH_ANIME_QUERY,
            variables: {
                search: searchTerm
            }
        })
    });

    if (!response.ok) {
        throw new Error(
            `AniList request failed with status ${response.status}`
        );
    }

    const result = await response.json();

    if (result.errors?.length) {
        throw new Error(result.errors[0].message);
    }

    return result.data?.Page?.media ?? [];
}

// ========================================
// SEARCH RESULTS
// ========================================

function renderSearchResults(animeList) {
    searchResults.replaceChildren();

    if (animeList.length === 0) {
        searchResults.textContent = "No anime found.";
        return;
    }

    animeList.forEach((anime) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "anime-result";

        button.textContent =
            anime.title.english ||
            anime.title.romaji ||
            anime.title.native ||
            "Untitled Anime";

        button.addEventListener("click", () => selectAnime(anime));

        searchResults.appendChild(button);
    });
}

// ========================================
// SELECTED ANIME DETAILS
// ========================================

function selectAnime(anime) {
    const title =
        anime.title.english ||
        anime.title.romaji ||
        anime.title.native ||
        "Untitled Anime";

    animeTitle.textContent = title;

    // Only show the requested information.
    const details = [
        `Episodes: ${anime.episodes ?? "Unknown"}`,
        `Rating: ${anime.averageScore != null
            ? `${anime.averageScore}/100`
            : "Not rated"}`,
        `Code: ${anime.id}`
    ];

    animeDescription.textContent = details.join("\n");

    animePoster.replaceChildren();

    const posterURL =
        anime.coverImage?.extraLarge ||
        anime.coverImage?.large;

    if (posterURL) {
        const image = document.createElement("img");
        image.src = posterURL;
        image.alt = `${title} poster`;
        image.loading = "lazy";
        animePoster.appendChild(image);
    }

    animeIndex.value = anime.id;
    selectedAnime = anime;
}

// ========================================
// FORMAT API VALUES
// ========================================

function formatAnimeValue(value) {
    if (!value) {
        return "";
    }

    return value
        .toLowerCase()
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// ========================================
// SEARCH FORM EVENT
// ========================================

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        searchResults.textContent = "Enter an anime title to search.";
        return;
    }

    searchResults.textContent = "Searching AniList...";

    try {
        const animeList = await searchAnime(searchTerm);

        renderSearchResults(animeList);
    } catch (error) {
        console.error("AniList search error:", error);

        searchResults.textContent =
            "Unable to search AniList. Please try again.";
    }
});

// ========================================
// SELECTED ANIME STATE
// ========================================

let selectedAnime = null;

// Update the player heading.
function updateEpisodeHeading() {
    const animeName = selectedAnime
        ? (
            selectedAnime.title.english ||
            selectedAnime.title.romaji ||
            selectedAnime.title.native ||
            "Unknown Anime"
        )
        : "Anime Name";

    const episode = episodeNumber.value || "1";

    currentEpisode.textContent =
        `${animeName} - Episode ${episode}`;
}

// Update heading when an anime is selected.
function selectAnime(anime) {
    const title =
        anime.title.english ||
        anime.title.romaji ||
        anime.title.native ||
        "Untitled Anime";

    animeTitle.textContent = title;

    const details = [
        `Episodes: ${anime.episodes ?? "Unknown"}`,
        `Rating: ${anime.averageScore != null
            ? `${anime.averageScore}/100`
            : "Not rated"}`,
        `Code: ${anime.id}`
    ];

    animeDescription.textContent = details.join("\n");

    animePoster.replaceChildren();

    const posterURL =
        anime.coverImage?.extraLarge ||
        anime.coverImage?.large;

    if (posterURL) {
        const image = document.createElement("img");
        image.src = posterURL;
        image.alt = `${title} poster`;
        image.loading = "lazy";
        animePoster.appendChild(image);
    }

    animeIndex.value = anime.id;
    selectedAnime = anime;

    // Reset to episode 1 when selecting another anime.
    episodeNumber.value = 1;

    updateEpisodeHeading();
}

// Update heading whenever the episode changes.
episodeNumber.addEventListener("input", updateEpisodeHeading);

// Set the initial heading.
updateEpisodeHeading();

// ======================================== //
//            STREAM SECTION                //
// ======================================== //

const streamForm = document.getElementById("stream-form");
const videoContainer = document.getElementById("video-container");

const previousEpisodeButton = document.getElementById("previous-episode");
const nextEpisodeButton = document.getElementById("next-episode");

const audioOptions = document.querySelectorAll('input[name="audio"]');

// Get the selected SUB/DUB track.
function getSelectedTrack() {
    return document.querySelector('input[name="audio"]:checked')?.value || "sub";
}

// Load the ZokoAnime stream.
function loadStream() {
    const animeCode = animeIndex.value.trim();
    const episode = Number(episodeNumber.value);
    const track = getSelectedTrack();

    if (!animeCode) {
        videoContainer.textContent = "Please select an anime or enter an anime code.";
        return;
    }

    if (!Number.isInteger(episode) || episode < 1) {
        videoContainer.textContent = "Please enter a valid episode number.";
        return;
    }

    if (!["sub", "dub"].includes(track)) {
        videoContainer.textContent = "Invalid audio track.";
        return;
    }

    const streamURL =
        `https://zokoanime.video/stream/ani/${encodeURIComponent(animeCode)}/${episode}/${track}?color=35d5bf&autoplay=true`;

    const iframe = document.createElement("iframe");

    iframe.src = streamURL;
    iframe.title = `${currentEpisode.textContent} (${track.toUpperCase()})`;
    iframe.allow = "fullscreen; autoplay";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    videoContainer.replaceChildren(iframe);
    updateEpisodeHeading();
}

// Play button.
streamForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadStream();
});

// Previous episode.
previousEpisodeButton.addEventListener("click", () => {
    const episode = Number(episodeNumber.value);

    if (episode > 1) {
        episodeNumber.value = episode - 1;
        updateEpisodeHeading();
        loadStream();
    }
});

// Next episode.
nextEpisodeButton.addEventListener("click", () => {
    const episode = Number(episodeNumber.value);

    if (Number.isInteger(episode) && episode >= 1) {
        episodeNumber.value = episode + 1;
        updateEpisodeHeading();
        loadStream();
    }
});

// Reload the stream when switching between SUB and DUB.
audioOptions.forEach((option) => {
    option.addEventListener("change", () => {
        if (videoContainer.querySelector("iframe")) {
            loadStream();
        }
    });
});
