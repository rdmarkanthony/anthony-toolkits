// shared by _videoPlayer and _youtubePlayer

// every player on the page, so playing one can pause the others
export const _players = [];

// pause the other non-autoplay players
export const _pauseAll = (currentPlayer) => {
    _players.forEach((item) => {
        if (item === currentPlayer || item.autoplay) return;

        // for youtube
        if (item.player?.getPlayerState?.() === 1) item.player.pauseVideo();

        // for video
        item.el.video?.pause();
    });
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
