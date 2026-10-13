// QR codes drawn as an svg in target (it fills target's width), qrcode loads only on pages that use it
// usage: const qr = await _qrCode({ target, text: "https://example.com" }), call again with new text to redraw
// qr.download("png" | "svg", "file-name") saves it, qr.svg is the markup, qr.text the text
// colors are hex, "#000000" or "#00000000" for transparent; _qrCode.wifi({ ssid, password }) makes the text for a wifi QR
const _defaults = {
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
    errorCorrectionLevel: "M",
    // png width in px
    size: 1024,
};

const _save = (url, name) => {
    const _link = document.createElement("a");
    _link.href = url;
    _link.download = name;
    _link.click();
};

export const _qrCode = async ({ target, text, ...props }) => {
    const { default: QRCode } = await import("qrcode");
    const { size, ...options } = { ..._defaults, ...props };

    const svg = await QRCode.toString(text, { ...options, type: "svg" });
    if (target) {
        target.innerHTML = svg;
        Object.assign(target.firstElementChild.style, { display: "block", width: "100%", height: "auto" });
    }

    return {
        text,
        svg,
        async download(type = "png", name = "qr-code") {
            if (type === "png") return _save(await QRCode.toDataURL(text, { ...options, width: size }), `${name}.png`);

            const _url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
            _save(_url, `${name}.svg`);
            setTimeout(() => URL.revokeObjectURL(_url));
        },
    };
};

// security: "WPA" (also WPA2/WPA3), "WEP" or "nopass"
_qrCode.wifi = ({ ssid, password = "", security = "WPA", hidden = false }) => {
    const _escape = (value) => String(value).replace(/([\\;,:"])/g, "\\$1");
    const _password = security === "nopass" ? "" : `P:${_escape(password)};`;

    return `WIFI:T:${security};S:${_escape(ssid)};${_password}${hidden ? "H:true;" : ""};`;
};
