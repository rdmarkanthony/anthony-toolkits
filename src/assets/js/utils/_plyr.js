// Plyr controls on a _videoPlayer's video
// usage: _plyr(player, { ...Plyr options }) in afterInit, sets player.plyr
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
        // Plyr's saved volume would unmute autoplay videos
        storage: { enabled: false },
        muted: player.isSilent,
        disableContextMenu: false,
        ...options,
    });

    // fill the player's box, except in fullscreen
    const _fill = (fill) => Object.assign(player.plyr.elements.container.style, { position: fill ? "absolute" : "", inset: fill ? 0 : "" });
    _fill(true);
    player.plyr.on("enterfullscreen", () => _fill(false));
    player.plyr.on("exitfullscreen", () => _fill(true));

    return player.plyr;
};
