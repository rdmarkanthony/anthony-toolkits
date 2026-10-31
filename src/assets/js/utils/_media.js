// shared by _videoPlayer and _youtubePlayer

export const _players = [];

export const _pauseAll = (currentPlayer) => {
    _players.forEach((item) => {
        if (item === currentPlayer || (item.isSilent ?? item.autoplay)) return;

        item.outViewPaused = false;

        if (item.player?.getPlayerState?.() === 1) item.player.pauseVideo();

        item.el?.video?.pause();
    });
};

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

export const _pauseOutView = (player) => {
    if (!player.pauseOutView || player.isInView !== false) return;

    player.outViewPaused = player.autoplay;
    player.pause();
};

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
