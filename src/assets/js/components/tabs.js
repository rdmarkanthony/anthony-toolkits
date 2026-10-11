import { _tabs } from "../utils/_tabs";

// expose for inline scripts
Object.assign(window, { _tabs });

// for every tab group
document.querySelectorAll(".js-tabs").forEach((target) => new _tabs({ target }));
