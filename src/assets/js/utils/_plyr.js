// Plyr controls on a _videoPlayer's video, Plyr loads only on pages that use it
// usage: _plyr(player, { ...Plyr options }) in the player's afterInit, then player.plyr is the Plyr instance
// player.destroy() removes Plyr too
// css, in your main css file: @import "plyr/dist/plyr.css";

// plyr, loaded on first use so other pages don't download it
const _importPlyr = () => import("plyr");

export const _plyr = async (player, options = {}) => {
    const { default: Plyr } = await _importPlyr();
    if (!player.el) return; // destroyed while loading

    player.plyr = new Plyr(player.el.video, {
        controls: ["play-large", "play", "progress", "current-time", "duration", "mute", "volume", "settings", "pip", "fullscreen"],
        settings: ["speed"],
        // Plyr saves the volume between pages, which would unmute autoplay videos
        storage: { enabled: false },
        muted: player.isSilent,
        disableContextMenu: false,
        ...options,
    });

    // fill the player's box like the video does, except in fullscreen (iOS uses a position: fixed fallback)
    const _fill = (fill) => Object.assign(player.plyr.elements.container.style, { position: fill ? "absolute" : "", inset: fill ? 0 : "" });
    _fill(true);
    player.plyr.on("enterfullscreen", () => _fill(false));
    player.plyr.on("exitfullscreen", () => _fill(true));

    return player.plyr;
};
