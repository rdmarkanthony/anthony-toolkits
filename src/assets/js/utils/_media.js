// shared by _videoPlayer and _youtubePlayer

// every player on the page, so playing one can pause the others
export const _players = [];

// pause the other players with sound, muted background videos keep playing
export const _pauseAll = (currentPlayer) => {
    _players.forEach((item) => {
        if (item === currentPlayer || (item.isSilent ?? item.autoplay)) return;

        // don't play again when back in view
        item.outViewPaused = false;

        if (item.player?.getPlayerState?.() === 1) item.player.pauseVideo();

        item.el?.video?.pause();
    });
};

// pauseOutView: pause while out of view, autoplay videos play again when back
export const _watchView = (player) => {
    const _observer = new IntersectionObserver(([entry]) => {
        player.isInView = entry.isIntersecting;

        if (player.isInView) {
            if (player.outViewPaused) player.play();
            player.outViewPaused = false;
        } else if (player.isPlaying) {
            _pauseOutView(player);
        }
    });

    _observer.observe(player.target);

    return () => _observer.disconnect();
};

// also called on play, e.g. autoplay starting out of view
export const _pauseOutView = (player) => {
    if (!player.pauseOutView || player.isInView !== false) return;

    // sound videos stay paused
    player.outViewPaused = player.autoplay;
    player.pause();
};

// size and center a 16:9 element to cover its parent, like object-fit: cover
export const _cover = (parent, element, aspectRatio = 16 / 9) => {
    const _width = parent.offsetWidth;
    const _height = parent.offsetHeight;
    const _wide = _width / _height > aspectRatio;

    const _newWidth = _wide ? _width : _height * aspectRatio;
    const _newHeight = _wide ? _width / aspectRatio : _height;

    element.style.top = `${(_height - _newHeight) / 2}px`;
    element.style.left = `${(_width - _newWidth) / 2}px`;
    element.style.width = `${_newWidth}px`;
    element.style.height = `${_newHeight}px`;
};
